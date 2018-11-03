const lsp = require('vscode-languageserver');
const createLinter = require('./lint');

const connection = lsp.createConnection();
const documents = new lsp.TextDocuments();
const capabilities = {};

connection.onInitialize((params) => {
  module.exports.root = params.rootPath;
  Object.assign(capabilities, createLinter(params.rootPath));
  require('./analysis');
  return {
    capabilities: {
      textDocumentSync: documents.syncKind,
      completionProvider: {
        triggerCharacters: ['.'],
      },
    },
  };
});

documents.onDidOpen((event) => {
  connection.sendDiagnostics({
    uri: event.document.uri,
    diagnostics: capabilities.getDiagnostics(event),
  });
});
documents.onDidChangeContent((event) => {
  connection.sendDiagnostics({
    uri: event.document.uri,
    diagnostics: capabilities.getDiagnostics(event),
  });
});
documents.onDidClose((event) => {
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
});

documents.listen(connection);
connection.listen();

module.exports = { connection, documents };
