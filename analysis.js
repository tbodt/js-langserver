const {Server: TernServer} = require('tern');
const fs = require('fs');
const path = require('path');
const util = require('util');
const URI = require('vscode-uri').default;
const ternProject = require('./tern-project');

const {connection, documents, root} = require('./index');

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
// TODO loadEagerly
tern.asyncRequest = util.promisify(tern.request);

// lsp <-> tern conversions
const nameFromUri = uri => path.relative(tern.options.projectDir, URI.parse(uri).fsPath);
const uriFromName = name => URI.file(path.resolve(tern.options.projectDir, name)).toString();
const ternPosition = ({line, character}) => ({line, ch: character});
const lspPosition = ({line, ch}) => ({line, character: ch});

function lspLocation(file, start, end) {
    return {
        uri: uriFromName(file),
        range: {
            start: lspPosition(start),
            end: lspPosition(end),
        },
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
    const {completions} = await tern.asyncRequest({
        query: {
            type: 'completions',
            file: nameFromUri(event.textDocument.uri),
            end: ternPosition(event.position),
            types: true,
            docs: true,
            caseInsensitive: true,
        },
    });
    return completions.map(completion => ({
        label: completion.name,
        detail: completion.type,
    }));
});

connection.onDefinition(async event => {
    const {file, start, end} = await tern.asyncRequest({
        query: {
            type: 'definition',
            file: nameFromUri(event.textDocument.uri),
            end: ternPosition(event.position),
            lineCharPositions: true,
        },
    });
    if (file === undefined)
        return null;
    return lspLocation(file, start, end);
});

connection.onHover(async event => {
    const info = await tern.asyncRequest({
        query: {
            type: 'type',
            file: nameFromUri(event.textDocument.uri),
            end: ternPosition(event.position),
            lineCharPositions: true,
        },
    });
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
    const {refs} = await tern.asyncRequest({
        query: {
            type: 'refs',
            file: nameFromUri(event.textDocument.uri),
            end: ternPosition(event.position),
            lineCharPositions: true,
        },
    });
    return refs.map(({file, start, end}) => lspLocation(file, start, end));
});
