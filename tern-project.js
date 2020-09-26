// All the code to read .tern-project is in bin/tern, so I can't just require it
const fs = require('fs');
const path = require('path');
const resolveFrom = require('resolve-from');

function readJson(file) {
    try {
        return JSON.parse(fs.readFileSync(file));
    } catch (e) {
        return {};
    }
}

const ternRoot = path.resolve(require.resolve('tern'), '../..');

module.exports = function(root) {
    let defaultProject = {};
    if (process.env.HOME)
        defaultProject = readJson(path.join(process.env.HOME, '.tern-config'));
    const project = Object.assign(defaultProject, readJson(path.join(root, '.tern-project')));
    function find(kind, name, ext) {
        let filename = name;
        if (!filename.endsWith(ext))
            filename += ext;

        let file = path.resolve(root, filename);
        if (fs.existsSync(file)) return file;
        file = path.resolve(ternRoot, kind, filename);
        if (fs.existsSync(file)) return file;
        file = resolveFrom(root, `tern-${name}`);
        if (fs.existsSync(file)) return file;
        file = require.resolve(`tern-${name}`);
        if (fs.existsSync(file)) return file;
    }

    // load plugins
    Object.keys(project.plugins || {}).forEach(plugin => {
        const file = find('plugin', plugin, '.js');
        if (file === undefined) {
            // eslint-disable-next-line no-console
            console.error(`Failed to load tern plugin ${plugin}`);
            return;
        }
        const mod = require(file);
        if (mod.hasOwnProperty('initialize'))
            mod.initialize(ternRoot);
    });

    // load defs
    const defs = [];
    for (const lib of (project.libs || [])) {
        const file = find('defs', lib, '.json');
        if (file === undefined) {
            // eslint-disable-next-line no-console
            console.error(`Failed to load tern lib ${lib}`);
            continue;
        }
        defs.push(file);
    }

    return {
        projectDir: root,
        plugins: project.plugins,
        loadEagerly: project.loadEagerly,
        defs,
        ecmaVersion: project.ecmaVersion || 6,
        dependencyBudget: project.dependencyBudget,
    };
};
