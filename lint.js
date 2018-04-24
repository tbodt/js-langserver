const assert = require('assert')
const URI = require('vscode-uri').default;
const lsp = require('vscode-languageserver');
const eslint = require('eslint');

const {connection, documents} = require('./index');

const SEVERITY_MAP = {
    1: lsp.DiagnosticSeverity.Warning,
    2: lsp.DiagnosticSeverity.Error,
};

function lintDocument(event) {
    const document = event.document;
    const linter = new eslint.CLIEngine();
    const report = linter.executeOnText(document.getText(), URI.parse(document.uri).fsPath);
    assert(report.results.length == 1);
    const diagnostics = report.results[0].messages.map(message => ({
        severity: SEVERITY_MAP[message.severity],
        range: {
            start: {line: message.line - 1, character: message.column - 1},
            end: {
                line: message.endLine !== undefined ?
                    message.endLine - 1 : message.line - 1,
                character: message.endColumn !== undefined ?
                    message.endColumn - 1 : message.column - 1,
            },
        },
        message: message.message,
        source: `eslint ${message.ruleId}`,
    }));
    connection.sendDiagnostics({uri: document.uri, diagnostics});
}

documents.onDidOpen(lintDocument);
documents.onDidChangeContent(lintDocument);
documents.onDidClose(event => {
    connection.sendDiagnostics({uri: event.document.uri, diagnostics: []});
});
