# js-langserver ![](https://img.shields.io/npm/v/js-langserver.svg) [![dependencies Status](https://david-dm.org/tbodt/js-langserver/status.svg)](https://david-dm.org/tbodt/js-langserver)

A simple language server for JavaScript, powered by ESLint and Tern.

I made this because sourcegraph/javascript-typescript-langserver is really bad at untyped JavaScript. It uses the intellisense library that's part of TypeScript as a backend, which makes it really good at TypeScript (probably, I've never used it for TypeScript) but much worse than Tern at regular JavaScript.

# Using the thing

I'm a vim user, so I just do this:

```
let g:LanguageClient_serverCommands = {
    \ 'javascript.jsx': ['js-langserver', '--stdio'],
    \ }
```

If you want to use VSCode, I think you're going to have to fork the project and add a 20-line VSCode extension. Not really sure how VSCode works.

# Obligatory stupid arbitrary feature matrix table thing

| | js-langserver | javascript-typescript-langserver | vscode-eslint | vscode-ternjs|
-|-|-|-|-
Lines of code <sub>(according to tokei)</sub> | 153 | 8,618 | 1,787 | 326
GitHub stars | ![][js-langserver stars] | ![][javascript-typescript-langserver stars] | ![][vscode-eslint stars] | ![][vscode-ternjs stars]
Tern | :white_check_mark: | :x: | :x: | yes, but no completions (???)
ESLint | :white_check_mark: | :x: | :white_check_mark: | :x:

[js-langserver stars]: https://img.shields.io/github/stars/tbodt/js-langserver.svg?style=social
[javascript-typescript-langserver stars]: https://img.shields.io/github/stars/sourcegraph/javascript-typescript-langserver.svg?style=social
[vscode-eslint stars]: https://img.shields.io/github/stars/Microsoft/vscode-eslint.svg?style=social
[vscode-ternjs stars]: https://img.shields.io/github/stars/hsiaosiyuan0/vscode-ternjs.svg?style=social

VSCode's builtin JavaScript support is not in here because I can't figure out how to use it with vim. vscode-ternjs is here despite having 1 GitHub star because it is literally the only language server I could find that used Tern.

