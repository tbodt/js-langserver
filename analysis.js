const bootstrapServer = require('tern/lib/bootstrap');
const path = require('path');
const util = require('util');
const URI = require('vscode-uri').default;

const {connection, documents, root} = require('./index');

const tern = bootstrapServer({
  projectDir: root,
  debug: true,
});
tern.asyncRequest = util.promisify(tern.request);
async function ternRequest(event, type, options = {}) {
    return await tern.asyncRequest({
        query: Object.assign({
            type,
            file: nameFromUri(event.textDocument.uri),
            end: ternPosition(event.position),
            lineCharPositions: true,
        }, options),
    });
}

// lsp <-> tern conversions
const nameFromUri = uri => path.relative(tern.options.projectDir, URI.parse(uri).fsPath);
const uriFromName = name => URI.file(path.resolve(tern.options.projectDir, name)).toString();
const ternPosition = ({line, character}) => ({line, ch: character});
const lspPosition = ({line, ch}) => ({line, character: ch});

function lspRange(start, end) {
    return {
        range: {
            start: lspPosition(start),
            end: lspPosition(end),
        },
    };
}

function lspLocation(file, start, end) {
    return {
        uri: uriFromName(file),
        ...lspRange(start, end),
    };
}

const onUpdate = async event => {
    const document = event.document;
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
documents.onDidClose(async event => {
    const document = event.document;
    await tern.asyncRequest({
        files: [{
            type: 'delete',
            name: nameFromUri(document.uri),
        }],
    });
});

connection.onCompletion(async event => {
    const {completions} = await ternRequest(event, 'completions', {
        types: true,
        docs: true,
        caseInsensitive: true,
    });
    return completions.map(completion => ({
        label: completion.name,
        detail: completion.type,
    }));
});

connection.onDefinition(async event => {
    const {file, start, end} = await ternRequest(event, 'definition');
    if (file === undefined)
        return null;
    return lspLocation(file, start, end);
});

connection.onHover(async event => {
    const info = await ternRequest(event, 'type');
    const lines = [];

    const name = info.exprName || info.name;
    let description = `${name}: ${info.type}`;
    if (info.type.startsWith('fn(') && name !== undefined)
        description = name + info.type.slice(2);
    lines.push(description);

    if (info.doc !== undefined)
        lines.push(info.doc);
    if (info.url !== undefined)
        lines.push(info.url);

    return {contents: lines.join('\n')};
});

connection.onReferences(async event => {
    const {refs} = await ternRequest(event, 'refs');
    return refs.map(({file, start, end}) => lspLocation(file, start, end));
});

connection.onRenameRequest(async event => {
    const {changes} = await ternRequest(event, 'rename', {
        newName: event.newName,
    });
    const changesByFile = changes.reduce((acc, change) => {
        const { file, start, end, text } = change;
        const completeName = uriFromName(file);
        if (!acc[completeName]) {
            acc[completeName] = [];
        }
        acc[completeName].push({
            newText: text,
            ...lspRange(start, end),
        });
        return acc;
    }, {});
    return { changes: changesByFile };
});
