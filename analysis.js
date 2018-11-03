const { Server: TernServer } = require('tern');
const fs = require('fs');
const path = require('path');
const util = require('util');
const URI = require('vscode-uri').default;
const ternProject = require('./tern-project');

const { connection, documents, root } = require('./index');

const tern = new TernServer(Object.assign(ternProject(root), {
  getFile(file, cb) {
    fs.readFile(path.resolve(root, file), 'utf8', cb);
  },
  normalizeFilename(name) {
    name = path.resolve(root, name);
    try {
      name = fs.realpathSync(name);
    } catch (e) {} // eslint-disable-line no-empty
    return path.relative(root, name);
  },
  async: true,
}));
//
// lsp <-> tern conversions
const nameFromUri = uri => path.relative(tern.options.projectDir, URI.parse(uri).fsPath);
const uriFromName = name => URI.file(path.resolve(tern.options.projectDir, name)).toString();
const ternPosition = ({ line, character }) => ({ line, ch: character });
const lspPosition = ({ line, ch }) => ({ line, character: ch });

// TODO loadEagerly
tern.asyncRequest = util.promisify(tern.request);
async function ternRequest(event, type, options = {}) {
  return tern.asyncRequest({
    query: Object.assign({
      type,
      file: nameFromUri(event.textDocument.uri),
      end: ternPosition(event.position),
      lineCharPositions: true,
    }, options),
  });
}

function lspLocation(file, start, end) {
  return {
    uri: uriFromName(file),
    range: {
      start: lspPosition(start),
      end: lspPosition(end),
    },
  };
}

const onUpdate = async (event) => {
  const { document } = event;
  await tern.asyncRequest({
    files: [{
      type: 'full',
      name: nameFromUri(document.uri),
      text: document.getText(),
    }],
  });
};
documents.onDidOpen(onUpdate);
documents.onDidChangeContent(onUpdate);
documents.onDidClose(async (event) => {
  const { document } = event;
  await tern.asyncRequest({
    files: [{
      type: 'delete',
      name: nameFromUri(document.uri),
    }],
  });
});

connection.onCompletion(async (event) => {
  const { completions } = await ternRequest(event, 'completions', {
    types: true,
    docs: true,
    caseInsensitive: true,
  });
  return completions.map(completion => ({
    label: completion.name,
    detail: completion.type,
  }));
});

connection.onDefinition(async (event) => {
  const { file, start, end } = await ternRequest(event, 'definition');
  if (file === undefined) {
    return null;
  }
  return lspLocation(file, start, end);
});

connection.onHover(async (event) => {
  const info = await ternRequest(event, 'type');
  const lines = [];

  const name = info.exprName || info.name;
  let description = `${name}: ${info.type}`;
  if (info.type.startsWith('fn(') && name !== undefined) {
    description = name + info.type.slice(2);
  }
  lines.push(description);

  if (info.doc !== undefined) {
    lines.push(info.doc);
  }
  if (info.url !== undefined) {
    lines.push(info.url);
  }

  return { contents: lines.join('\n') };
});

connection.onReferences(async (event) => {
  const { refs } = await ternRequest(event, 'refs');
  return refs.map(({ file, start, end }) => lspLocation(file, start, end));
});

connection.onRenameRequest(async (event) => {
  const { changes } = await ternRequest(event, 'rename', {
    newName: event.newName,
  });
  return changes.map(({ file, start, end, text }) => ({
    range: lspLocation(file, start, end),
    newText: text,
  }));
});
