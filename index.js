#!/usr/bin/env node
const lsp = require('vscode-languageserver');

const connection = lsp.createConnection();
const documents = new lsp.TextDocuments();
documents.listen(connection);

connection.onInitialize(params => {
    module.exports.root = params.rootPath;
    require('./lint');
    require('./analysis');
    return {
        capabilities: {
            completionProvider: {
                resolveProvider: true,
                triggerCharacters: ['.'],
            },
            definitionProvider: true,
            hoverProvider: true,
            renameProvider: true,
            referencesProvider: true,
            textDocumentSync: documents.syncKind,
        },
    };
});

module.exports = {connection, documents};

connection.listen();
