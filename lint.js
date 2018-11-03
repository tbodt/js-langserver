const resolveFrom = require('resolve-from');
const URI = require('vscode-uri').default;
const lsp = require('vscode-languageserver');

const SEVERITY_MAP = {
  1: lsp.DiagnosticSeverity.Warning,
  2: lsp.DiagnosticSeverity.Error,
};

const lintersByRoot = {};

function getLinter(root) {
  if (!lintersByRoot[root]) {
    const eslintModulePath = resolveFrom(root, 'eslint');
    const eslint = require(eslintModulePath); // eslint-disable-line
    lintersByRoot[root] = new eslint.CLIEngine({ cwd: root });
  }
  return lintersByRoot[root];
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

module.exports = root => ({
  getDiagnostics: event => getDiagnosticsForFile(
    getLinter(root),
    event.document.getText(),
    URI.parse(event.document.uri).fsPath,
  ),
});
