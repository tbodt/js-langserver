const {Server: TernServer} = require('tern');
const path = require('path');
const util = require('util');
const URI = require('vscode-uri').default;
const ternProject = require('./tern-project');

const {connection, documents} = require('./index');

let tern;

function nameFromUri(uri) {
    return path.relative(tern.root, URI.parse(uri).fsPath);
}

function startTern(root) {
    const ternConfig = ternProject(root);
    tern = new TernServer(ternConfig);
    tern.root = root;
    tern.asyncRequest = util.promisify(tern.request);
    // TODO loadEagerly
}

connection.onInitialize(params => {
    startTern(params.rootPath);
    return {
        capabilities: {
            textDocumentSync: documents.syncKind,
            completionProvider: {
                triggerCharacters: ['.'],
            },
        },
    };
});

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
    let position = event.position;
    position = {line: position.line, ch: position.character};
    const completions = await tern.asyncRequest({
        query: {
            type: 'completions',
            file: nameFromUri(event.textDocument.uri),
            end: position,
            types: true,
            docs: true,
            caseInsensitive: true,
        },
    });
    console.log(completions);
    return completions.completions.map(completion => ({
        label: completion.name,
        detail: completion.type + ' lol',
    }));
});

