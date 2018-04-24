const lsp = require('vscode-languageserver');

const connection = lsp.createConnection();
const documents = new lsp.TextDocuments();
documents.listen(connection);

module.exports = {connection, documents};
require('./lint');
require('./complete');

connection.listen();
