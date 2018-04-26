#!/usr/bin/env node
const lsp = require('vscode-languageserver');

const connection = lsp.createConnection();
const documents = new lsp.TextDocuments();
documents.listen(connection);

connection.onInitialize(params => {
    module.exports.root = params.rootPath;
    require('./lint');
    require('./complete');
    return {
        capabilities: {
            textDocumentSync: documents.syncKind,
            completionProvider: {
                triggerCharacters: ['.'],
            },
        },
    };
});

module.exports = {connection, documents};

connection.listen();
