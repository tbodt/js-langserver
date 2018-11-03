#!/usr/bin/env node
const lsp = require('vscode-languageserver');

const connection = lsp.createConnection();
const documents = new lsp.TextDocuments();
documents.listen(connection);

connection.onInitialize((params) => {
  module.exports.root = params.rootPath;
  require('./lint'); // eslint-disable-line global-require
  require('./analysis'); // eslint-disable-line global-require
  return {
    capabilities: {
      textDocumentSync: documents.syncKind,
      completionProvider: {
        triggerCharacters: ['.'],
      },
    },
  };
});

module.exports = { connection, documents };

connection.listen();
