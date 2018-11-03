const resolveFrom = require('resolve-from');
const URI = require('vscode-uri').default;
const lsp = require('vscode-languageserver');

const { connection, documents, root } = require('./index');

const SEVERITY_MAP = {
  1: lsp.DiagnosticSeverity.Warning,
  2: lsp.DiagnosticSeverity.Error,
};

function getLinter() {
  const eslintModulePath = resolveFrom(root, 'eslint');
  const eslint = require(eslintModulePath); // eslint-disable-line
  return new eslint.CLIEngine({ cwd: root });
}

function getDiagnosticsForFile(linter, text, path) {
  const report = linter.executeOnText(text, path);
  const messages = report.results[0] ? report.results[0].messages : [];
  const diagnostics = messages.map(message => ({
    severity: SEVERITY_MAP[message.severity],
    range: {
      start: { line: message.line - 1, character: message.column - 1 },
      end: {
        line: message.endLine !== undefined
          ? message.endLine - 1 : message.line - 1,
        character: message.endColumn !== undefined
          ? message.endColumn - 1 : message.column - 1,
      },
    },
    message: `${message.message} (${message.ruleId})`,
    source: `eslint ${message.ruleId}`,
  }));
  return diagnostics;
}

function getDiagnostics(event) {
  return getDiagnosticsForFile(
    getLinter(root),
    event.document.getText(),
    URI.parse(event.document.uri).fsPath,
  );
}

documents.onDidOpen((event) => {
  connection.sendDiagnostics({
    uri: event.document.uri,
    diagnostics: getDiagnostics(event),
  });
});
documents.onDidChangeContent((event) => {
  connection.sendDiagnostics({
    uri: event.document.uri,
    diagnostics: getDiagnostics(event),
  });
});
documents.onDidClose((event) => {
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
});
