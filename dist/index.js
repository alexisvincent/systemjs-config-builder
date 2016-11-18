'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/**
 * Copyright 2016 Alexis Vincent (http://alexisvincent.io)
 */
var fs = require('graceful-fs');
var path = require('path');
var Promise = require('bluebird');
var _ = require('lodash');

var _require = require('jspm-npm/lib/node-conversion'),
    convertPackage = _require.convertPackage;

var _require2 = require('util'),
    inspect = _require2.inspect;

var nodeCoreModules = exports.nodeCoreModules = ['assert', 'buffer', 'child_process', 'cluster', 'console', 'constants', 'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'http', 'https', 'module', 'net', 'os', 'path', 'process', 'punycode', 'querystring', 'readline', 'repl', 'stream', 'string_decoder', 'sys', 'timers', 'tls', 'tty', 'url', 'util', 'vm', 'zlib'];

var compatLibs = [
    //     'console',
    //     'https',
    //     'path',
    //     'util',
    //     'zlib'
];

var pfs = {};

/**
 * Promisify all fs functions
 */
Object.keys(fs).map(function (key) {
    if (typeof fs[key] == 'function') pfs[key] = Promise.promisify(fs[key]);
});

var log = function log(obj) {
    return console.log(inspect(obj, { depth: null }));
};

/**
 * Get all directories in a directory
 * @param srcpath
 * @returns {Promise.<*>}
 */
var getDirectories = function getDirectories(srcpath) {
    return pfs.readdir(srcpath).then(function (dirs) {
        return Promise.all(dirs.filter(function (file) {
            return fs.statSync(path.join(srcpath, file)).isDirectory();
        }));
    });
};

/**
 * For a given dir, get the corresponding package.json
 * @param dir
 * @returns {Promise.<TResult>}
 */
var getPackageConfig = exports.getPackageConfig = function getPackageConfig(dir) {
    return pfs.readFile(path.join(dir, 'package.json'), 'utf8').then(JSON.parse).then(function (config) {
        return Object.assign({
            dependencies: {},
            devDependencies: {},
            peerDependencies: {},
            augmented: false
        }, config);
    }).catch(function () {
        return null;
    });
};

/**
 * Return the dependencies that live in the first level of node_modules
 * @param packageDir
 * @returns {Promise.<TResult>}
 */
var getOwnDeps = exports.getOwnDeps = function getOwnDeps(packageDir) {
    var node_modules = path.join(packageDir, 'node_modules');

    return pfs.access(node_modules).then(function () {
        return getDirectories(node_modules);
    })
    // Map directories to their package.json
    .then(function (dirs) {
        return Promise.all(dirs.map(function (dir) {
            return getPackageConfig(path.join(packageDir, 'node_modules', dir));
        }));
    })
    // Filter out anything that wasn't a package
    .then(function (configs) {
        return configs.filter(function (k, v) {
            return v;
        });
    }).catch(function (err) {
        // console.log(err)
        return [];
    });
};

/**
 * Trace the full node_modules tree.
 * @param directory
 * @param name
 * @param version
 * @param registry
 * @returns {Promise.<{tree: *, registry: Array}>}
 */
var traceModuleTree = exports.traceModuleTree = function traceModuleTree(directory) {
    var name = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    var version = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    var registry = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];


    return Promise.resolve({ name: name, version: version })
    // Resolve the package.json and set name and version from there if either is not specified
    .then(function (_ref) {
        var name = _ref.name,
            version = _ref.version;
        return !name || !version ? getPackageConfig(directory) : { name: name, version: version };
    }).then(function (_ref2) {
        var name = _ref2.name,
            version = _ref2.version;
        return (

            // Get the dependencies in node_modules
            getOwnDeps(directory)

            // Merge package { name@version : package.json } into the registry
            .then(function (ownDeps) {
                // console.log(ownDeps)
                ownDeps.forEach(function (dep) {
                    var versionName = dep.name + '@' + dep.version;
                    registry[versionName] = {
                        name: dep.name,
                        config: dep,
                        key: versionName,
                        location: path.join(directory, 'node_modules', dep.name)
                    };
                });

                return ownDeps;
            }).then(function (ownDeps) {
                // map each package.json to it's own tree
                return Promise.all(ownDeps.map(function (_ref3) {
                    var name = _ref3.name,
                        version = _ref3.version;

                    return traceModuleTree(path.join(directory, 'node_modules', name), name, version, registry)
                    // Drop the registry
                    .then(function (_ref4) {
                        var tree = _ref4.tree,
                            registry = _ref4.registry;
                        return tree;
                    });
                    // map the module and its dep list to a tree entry
                })).then(function (deps) {
                    return { name: name, deps: deps, version: version };
                });
            }).then(function (tree) {
                return { tree: tree, registry: registry };
            })
        );
    });
};

var objectify = function objectify(key, array) {
    return array.reduce(function (obj, arrayItem) {
        obj[arrayItem[key]] = arrayItem;
        return obj;
    }, {});
};

var augmentRegistry = exports.augmentRegistry = function augmentRegistry(registry) {
    return Promise.all(Object.keys(registry).map(function (key) {
        var depMap = registry[key];

        return depMap.augmented ? depMap : convertPackage(depMap.config, ':' + key, './' + depMap.location, console).then(function (config) {
            return Object.assign(depMap, { config: config, augmented: true });
        }).catch(log);
    })).then(objectify.bind(null, 'key'));
};

var augmentModuleTree = exports.augmentModuleTree = function augmentModuleTree(_ref5) {
    var tree = _ref5.tree,
        registry = _ref5.registry;
    return augmentRegistry(registry).then(function (registry) {
        return { tree: tree, registry: registry };
    });
};

var pruneRegistry = exports.pruneRegistry = function pruneRegistry(registry) {
    return Promise.resolve(objectify('key', Object.keys(registry).map(function (key) {
        return Object.assign({}, registry[key], {
            config: _.pick(registry[key].config, ['meta', 'map', 'main',
            // 'format',
            'defaultExtension', 'defaultJSExtensions'])
        });
    })));
};

var pruneModuleTree = exports.pruneModuleTree = function pruneModuleTree(_ref6) {
    var tree = _ref6.tree,
        registry = _ref6.registry;
    return pruneRegistry(registry).then(function (registry) {
        return { tree: tree, registry: registry };
    });
};

/**
 * Walk the tree
 * @param tree
 * @param registry
 * @param f
 * @param depth
 * @param skip
 */
var walkTree = exports.walkTree = function walkTree(_ref7, f) {
    var tree = _ref7.tree,
        registry = _ref7.registry;
    var depth = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : Infinity;
    var skip = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;

    if (depth >= 1) {
        var name = tree.name,
            deps = tree.deps,
            version = tree.version;


        if (skip <= 0) f(registry[name + '@' + version], deps, tree);

        if (depth >= 2) deps.forEach(function (tree) {
            return walkTree({ tree: tree, registry: registry }, f, depth - 1, skip - 1);
        });
    }
};

var generateConfig = exports.generateConfig = function generateConfig(_ref8) {
    var tree = _ref8.tree,
        registry = _ref8.registry;

    var systemConfig = {
        "map": {},
        "packages": {}
    };

    systemConfig['map']["_stream_transform"] = "node_modules/readable-stream/transform";

    // Top level maps
    walkTree({ tree: tree, registry: registry }, function (_ref9, deps) {
        var name = _ref9.name,
            config = _ref9.config,
            key = _ref9.key,
            location = _ref9.location;

        systemConfig['map'][name] = location;
    }, 2, 1);

    // Walk the others and generate package entries
    walkTree({ tree: tree, registry: registry }, function (_ref10, deps, tree) {
        var name = _ref10.name,
            config = _ref10.config,
            key = _ref10.key,
            location = _ref10.location;


        var depMappings = {};

        walkTree({ tree: tree, registry: registry }, function (_ref11, deps) {
            var name = _ref11.name,
                config = _ref11.config,
                key = _ref11.key,
                location = _ref11.location;

            depMappings[name] = location;
        }, 2, 1);

        var packageEntry = Object.assign({
            map: {},
            meta: {}
        }, config);

        packageEntry['map'] = Object.assign(packageEntry['map'], depMappings);

        if (Object.keys(packageEntry['map']).length == 0) delete packageEntry['map'];

        systemConfig['packages'][location] = packageEntry;

        nodeCoreModules.forEach(function (lib) {
            systemConfig['map'][lib] = "node_modules/jspm-nodelibs-" + lib;
        });
    }, Infinity, 1);

    return Promise.resolve(systemConfig);
};

// This needs to be done better (fails if locations of shit changes)
var mergeCache = exports.mergeCache = function mergeCache(registry, cachedRegistry) {
    return Object.assign({}, registry, cachedRegistry);
};

var fromCache = exports.fromCache = function fromCache(_ref12) {
    var tree = _ref12.tree,
        registry = _ref12.registry;

    return dehydrateCache().then(function (cachedRegistry) {
        return { tree: tree, registry: mergeCache(registry, cachedRegistry) };
    });
};

var toCache = exports.toCache = function toCache(_ref13) {
    var tree = _ref13.tree,
        registry = _ref13.registry;

    return hydrateCache(registry).then(function () {
        return { tree: tree, registry: registry };
    });
};

var serializeConfig = exports.serializeConfig = function serializeConfig(config) {
    return 'SystemJS.config(' + JSON.stringify(config) + ')';
};

var hydrateCache = function hydrateCache(registry) {
    return Promise.resolve(JSON.stringify(registry)).then(pfs.writeFile.bind(null, './systemjs.cache'));
};

var dehydrateCache = function dehydrateCache() {
    return pfs.readFile('./systemjs.cache', 'utf8').then(JSON.parse).catch(function (e) {
        console.log("No cache, parsing node_modules. Warning this may take a while.");
        return {};
    });
};

traceModuleTree('.').then(fromCache).then(augmentModuleTree).then(toCache).then(pruneModuleTree).then(generateConfig).then(serializeConfig).then(pfs.writeFile.bind(null, './generated.config.js'));

// generateCache('.').then(readCache)

// getDirectories('./test').then(console.log.bind(console))
// getOwnDeps('./test').then(console.log.bind(console))
// getPackageConfig('.').then(console.log.bind(console))