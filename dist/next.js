'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

/**
 * Copyright 2016 Alexis Vincent (http://alexisvincent.io)
 */
var fs = require('mz/fs');
var path = require('path').posix;
var Promise = require('bluebird');
var _ = require('lodash');
var semver = require('semver');

var _require = require('jspm-npm/lib/node-conversion'),
    convertPackage = _require.convertPackage;

var _require2 = require('util'),
    inspect = _require2.inspect;

var nodeCoreModules = exports.nodeCoreModules = ['assert', 'buffer', 'child_process', 'cluster', 'console', 'constants', 'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'http', 'https', 'module', 'net', 'os', 'path', 'process', 'punycode', 'querystring', 'readline', 'repl', 'stream', 'string_decoder', 'sys', 'timers', 'tls', 'tty', 'url', 'util', 'vm', 'zlib'];

// Promise.awaitAll = (promiseArray) => {
//   return (
//     Promise.resolve(promiseArray)
//       .map(p => Promise.resolve(p))
//       .then(promiseArray => {
//         return promiseArray.map(p => p.catch((e) => ({
//           __awaitAll: true,
//           promise: p
//         })))
//       }).map(p => p.__awaitAll ? p.promise : p)
//   )
// }
//
// const seperate = (promiseArray) => {
//   return (
//     Promise.awaitAll(promiseArray).then()
//   )
// }

var log = function log(obj) {
  return console.log(inspect(obj, { depth: null }));
};

/**
 * Get all directories in a directory
 * @param srcpath
 * @returns {Promise.<*>}
 */
var getDirectories = function getDirectories(srcpath) {
  return Promise.resolve(fs.readdir(srcpath).then(function (files) {
    return files.filter(function (file) {
      return fs.statSync(path.join(srcpath, file)).isDirectory();
    }).map(function (dir) {
      return path.join(srcpath, dir);
    });
  }));
};

var isPackageDirectory = function () {
  var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(dir) {
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return fs.exists(path.join(dir, 'package.json'));

          case 2:
            return _context.abrupt('return', _context.sent);

          case 3:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, undefined);
  }));

  return function isPackageDirectory(_x) {
    return _ref.apply(this, arguments);
  };
}();

/**
 * For a given dir, get the corresponding package.json
 * @param dir
 * @returns {Promise.<TResult>}
 */
var getPJSON = exports.getPJSON = function getPJSON(dir) {
  return fs.readFile(path.join(dir, 'package.json'), 'utf8').then(JSON.parse)
  // Pad it with defaults
  .then(function (pjson) {
    return _extends({
      dependencies: {},
      devDependencies: {},
      peerDependencies: {}

    }, pjson, {

      _augmented: false,
      _locations: [dir],
      _key: pjson.name + '@' + pjson.version
    });
  }).catch(function () {
    return false;
  });
};

/**
 * Return the dependencies that live in the first level of node_modules
 * @param packageDir
 * @returns {Promise.<TResult>}
 */
var getOwnDepsDEPRECATED = exports.getOwnDepsDEPRECATED = function getOwnDepsDEPRECATED(packageDir) {
  var node_modules = path.join(packageDir, 'node_modules');

  return fs.access(node_modules).then(function () {
    return getDirectories(node_modules);
  })
  // Map directories to their package.json
  .then(function (dirs) {
    return Promise.all(dirs.map(function (dir) {
      return getPJSON(path.join(packageDir, 'node_modules', dir));
    }));
  })
  // Filter out anything that wasn't a package
  .then(function (configs) {
    return configs.filter(function (v, k) {
      return v;
    });
  }).catch(function (err) {
    // console.log(err)
    return [];
  });
};

var test = exports.test = function () {
  var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2() {
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.t0 = console;
            _context2.t1 = Object;
            _context2.t2 = addPackagesToRegistry;
            _context2.t3 = {};
            _context2.next = 6;
            return getAllSubPackages('.').map(getPJSON);

          case 6:
            _context2.t4 = _context2.sent;
            _context2.t5 = (0, _context2.t2)(_context2.t3, _context2.t4);

            _context2.t6 = function (entry) {
              return entry._locations.length > 1;
            };

            _context2.t7 = _context2.t1.values.call(_context2.t1, _context2.t5).filter(_context2.t6);

            _context2.t0.log.call(_context2.t0, _context2.t7);

          case 11:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, undefined);
  }));

  return function test() {
    return _ref2.apply(this, arguments);
  };
}();

var getSubPackageDirectories = exports.getSubPackageDirectories = function () {
  var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(packageDir) {
    var node_modules, dirs;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            node_modules = path.join(packageDir, 'node_modules');
            _context4.next = 3;
            return fs.exists(node_modules);

          case 3:
            if (!_context4.sent) {
              _context4.next = 16;
              break;
            }

            _context4.next = 6;
            return isPackageDirectory(node_modules);

          case 6:
            if (!_context4.sent) {
              _context4.next = 10;
              break;
            }

            return _context4.abrupt('return', [node_modules]);

          case 10:
            _context4.next = 12;
            return getDirectories(node_modules).map(function () {
              var _ref4 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(dir) {
                return regeneratorRuntime.wrap(function _callee3$(_context3) {
                  while (1) {
                    switch (_context3.prev = _context3.next) {
                      case 0:
                        _context3.next = 2;
                        return isPackageDirectory(dir);

                      case 2:
                        if (!_context3.sent) {
                          _context3.next = 6;
                          break;
                        }

                        return _context3.abrupt('return', Promise.resolve([dir]));

                      case 6:
                        return _context3.abrupt('return', getDirectories(dir).filter(isPackageDirectory));

                      case 7:
                      case 'end':
                        return _context3.stop();
                    }
                  }
                }, _callee3, undefined);
              }));

              return function (_x3) {
                return _ref4.apply(this, arguments);
              };
            }());

          case 12:
            dirs = _context4.sent;
            return _context4.abrupt('return', Promise.resolve([].concat.apply([], dirs)));

          case 14:
            _context4.next = 17;
            break;

          case 16:
            return _context4.abrupt('return', Promise.resolve([]));

          case 17:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, undefined);
  }));

  return function getSubPackageDirectories(_x2) {
    return _ref3.apply(this, arguments);
  };
}();

var getAllSubPackages = exports.getAllSubPackages = function () {
  var _ref5 = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(directory) {
    var subPackages;
    return regeneratorRuntime.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            subPackages = getSubPackageDirectories(directory).map(function () {
              var _ref6 = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(dir) {
                return regeneratorRuntime.wrap(function _callee5$(_context5) {
                  while (1) {
                    switch (_context5.prev = _context5.next) {
                      case 0:
                        _context5.t0 = [dir];
                        _context5.t1 = _toConsumableArray;
                        _context5.next = 4;
                        return getAllSubPackages(dir);

                      case 4:
                        _context5.t2 = _context5.sent;
                        _context5.t3 = (0, _context5.t1)(_context5.t2);
                        return _context5.abrupt('return', _context5.t0.concat.call(_context5.t0, _context5.t3));

                      case 7:
                      case 'end':
                        return _context5.stop();
                    }
                  }
                }, _callee5, undefined);
              }));

              return function (_x5) {
                return _ref6.apply(this, arguments);
              };
            }());
            _context6.t0 = Promise;
            _context6.t1 = [].concat;
            _context6.t2 = [];
            _context6.next = 6;
            return subPackages;

          case 6:
            _context6.t3 = _context6.sent;
            _context6.t4 = _context6.t1.apply.call(_context6.t1, _context6.t2, _context6.t3);
            return _context6.abrupt('return', _context6.t0.resolve.call(_context6.t0, _context6.t4));

          case 9:
          case 'end':
            return _context6.stop();
        }
      }
    }, _callee6, undefined);
  }));

  return function getAllSubPackages(_x4) {
    return _ref5.apply(this, arguments);
  };
}();

var addPackagesToRegistry = exports.addPackagesToRegistry = function addPackagesToRegistry(registry, packages) {

  // TODO: This can be made significantly faster by not doing it one by one
  // Should take advantage of the fact that we have been given a list
  var addPackageToRegistry = function addPackageToRegistry(registry, pjson) {
    var existingEntry = registry[pjson._key] || {
      _locations: [],
      _augmented: false
    };

    // merge the two entries, preferring the one that is augmented, then the new one
    var entry = _extends({}, !existingEntry._augmented ? existingEntry : pjson, existingEntry._augmented ? existingEntry : pjson, {
      _locations: _.uniq([].concat(_toConsumableArray(existingEntry._locations), _toConsumableArray(pjson._locations)))
    });

    return _extends({}, registry, _defineProperty({}, entry._key, entry));
  };

  return packages.reduce(addPackageToRegistry, {});
};

/**
 * Trace the full node_modules tree, and build up a registry on the way.
 *
 * Registry is of the form:
 * {
 *    'lodash@1.1.2': {
 *      name: 'lodash',
 *      version: '1.1.2',
 *      config: <the package.json file>,
 *      key: 'lodash@1.1.2',
 *      location: 'node_modules/lodash'
 *    },
 *    ...
 * }
 *
 * @param directory
 * @param name
 * @param version
 * @param registry
 * @returns registry: Array
 */
var traceModuleTree = exports.traceModuleTree = function traceModuleTree(directory) {
  var name = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  var version = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  var registry = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};


  return Promise.resolve({ name: name, version: version })
  // Resolve the package.json and set name and version from there if either is not specified
  .then(function (_ref7) {
    var name = _ref7.name,
        version = _ref7.version;
    return !name || !version ? getPJSON(directory) : { name: name, version: version };
  }).then(function (_ref8) {
    var name = _ref8.name,
        version = _ref8.version;
    return (

      // Get the dependencies in node_modules
      getOwnDepsDEPRECATED(directory)

      // Merge package { name@version : package.json } into the registry
      .then(function (ownDeps) {
        // console.log(ownDeps)
        ownDeps.forEach(function (dep) {
          var versionName = dep.name + '@' + dep.version;
          registry[versionName] = {
            name: dep.name,
            config: dep,
            version: dep.version,
            key: versionName,
            location: path.join(directory, 'node_modules', dep.name)
          };
        });

        return ownDeps;
      }).then(function (ownDeps) {
        // map each package.json to it's own tree
        return Promise.all(ownDeps.map(function (_ref9) {
          var name = _ref9.name,
              version = _ref9.version;

          return traceModuleTree(path.join(directory, 'node_modules', name), name, version, registry)
          // Drop the registry
          .then(function (_ref10) {
            var tree = _ref10.tree,
                registry = _ref10.registry;
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

/**
 * Take an array of objects and turn it into an object with the key being the specified key.
 *
 * objectify('name', [
 *      {name: 'Alexis', surname: 'Vincent'},
 *      {name: 'Julien', surname: 'Vincent'}
 * ])
 *
 * =>
 *
 * {
 *    'Alexis': {name: 'Alexis', surname: 'Vincent'},
 *    'Julien': {name: 'Julien', surname: 'Vincent'},
 * }
 *
 * @param key
 * @param array
 * @returns {*}
 */
var objectify = function objectify(key, array) {
  return array.reduce(function (obj, arrayItem) {
    obj[arrayItem[key]] = arrayItem;
    return obj;
  }, {});
};

/**
 * Given a registry of package.json files, use jspm/npm to augment them to be SystemJS compatible
 * @param registry
 * @returns {Promise.<TResult>}
 */
var augmentRegistry = exports.augmentRegistry = function augmentRegistry(registry) {
  return Promise.all(Object.keys(registry).map(function (key) {
    var depMap = registry[key];

    // Don't augment things that already have been (from the cache)
    var shouldAugment = !depMap.augmented;

    // Don't augment things that specify config.jspmPackage
    if (depMap.config.jspmPackage != undefined && depMap.config.jspmPackage) shouldAugment = false;

    // Don't augment things that specify config.jspmNodeConversion == false
    if (depMap.config.jspmNodeConversion !== undefined && !depMap.config.jspmNodeConversion) shouldAugment = false;

    // Don't augment things that specify config.jspm.jspmNodeConversion == false
    if (depMap.config.jspm !== undefined && depMap.config.jspm.jspmNodeConversion !== undefined && !depMap.config.jspm.jspmNodeConversion) shouldAugment = false;

    // Augment the package.json
    return shouldAugment ? convertPackage(depMap.config, ':' + key, './' + depMap.location, console).then(function (config) {
      return Object.assign(depMap, { config: config, augmented: true });
    }).catch(log) : depMap;
  })).then(objectify.bind(null, 'key'));
};

/**
 * Convenience method to allow easy chaining
 * @param tree
 * @param registry
 */
var augmentModuleTree = exports.augmentModuleTree = function augmentModuleTree(_ref11) {
  var tree = _ref11.tree,
      registry = _ref11.registry;
  return augmentRegistry(registry).then(function (registry) {
    return { tree: tree, registry: registry };
  });
};

/**
 * Only keep keys we are interested in for package config generation
 * @param registry
 * @returns {Promise.<*>}
 */
var pruneRegistry = exports.pruneRegistry = function pruneRegistry(registry) {
  return Promise.resolve(objectify('key', Object.keys(registry).map(function (key) {
    return Object.assign({}, registry[key], {
      config: _.pick(registry[key].config, ['meta', 'map', 'main', 'format', 'defaultExtension', 'defaultJSExtensions'])
    });
  })));
};

/**
 * Convenience method to allow easy chaining
 * @param tree
 * @param registry
 */
var pruneModuleTree = exports.pruneModuleTree = function pruneModuleTree(_ref12) {
  var tree = _ref12.tree,
      registry = _ref12.registry;
  return pruneRegistry(registry).then(function (registry) {
    return { tree: tree, registry: registry };
  });
};

/**
 * Walk the tree, call f on all nodes.
 * @param tree
 * @param registry
 * @param f - (versionName, deps, tree)
 * @param depth - How deep should we go
 * @param skip - How many levels should we skip
 */
var walkTree = exports.walkTree = function walkTree(_ref13, f) {
  var tree = _ref13.tree,
      registry = _ref13.registry;
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

/**
 * resolve the package registry entry that should be used given
 * @param packageName - name of package to resolve
 * @param semverRange - acceptable version range
 * @param dir - directory the caller lives in
 * @param registry - registry object
 */
var resolvePackage = function resolvePackage(packageName, semverRange, dir, registry) {
  return Object.Values(registry).filter(function (_ref14) {
    var name = _ref14.name;
    return name == registry;
  }).filter(function (_ref15) {
    var version = _ref15.version;
    return semver.satisfies(version, semverRange);
  }).filter(function (_ref16) {
    var location = _ref16.location;

    location.split('/').indexOf('node_modules');
  });
};

/**
 * Use the tree and registry to create a SystemJS config
 *
 * TODO: Use SystemJS 20 normalize idempotency to optimize mappings
 * // Do this by mapping package@version to location like JSPM does
 *
 * @param tree
 * @param registry
 * @returns {Promise.<{map: {}, packages: {}}>}
 */
var generateConfig = exports.generateConfig = function generateConfig(_ref17) {
  var tree = _ref17.tree,
      registry = _ref17.registry;


  var systemConfig = {
    "map": {},
    "packages": {}
  };

  // get readable stream working
  // TODO: Fix this hack
  systemConfig['map']["_stream_transform"] = "node_modules/readable-stream/transform";

  // Walk first level of dependencies and map package name to location
  walkTree({ tree: tree, registry: registry }, function (_ref18, deps) {
    var name = _ref18.name,
        config = _ref18.config,
        key = _ref18.key,
        location = _ref18.location;

    systemConfig['map'][name] = location;
  }, 2, 1);

  // Walk full dep tree and assign package config entries
  walkTree({ tree: tree, registry: registry }, function (_ref19, deps, tree) {
    var name = _ref19.name,
        config = _ref19.config,
        key = _ref19.key,
        location = _ref19.location;


    // Construct package entry based off config
    var packageEntry = Object.assign({
      map: {},
      meta: {}
    }, config);

    // Add mappings for it's deps.
    walkTree({ tree: tree, registry: registry }, function (_ref20, deps) {
      var name = _ref20.name,
          config = _ref20.config,
          key = _ref20.key,
          location = _ref20.location;

      packageEntry['map'][name] = location;
    }, 2, 1);

    // If there are no mappings, don't pollute the config
    if (Object.keys(packageEntry['map']).length == 0) delete packageEntry['map'];

    // Assign package entry to config
    systemConfig['packages'][location] = packageEntry;

    // Add mappings for all jspm-nodelibs
    // TODO: Fix this hack
    nodeCoreModules.forEach(function (lib) {
      systemConfig['map'][lib] = "node_modules/jspm-nodelibs-" + lib;
    });
  }, Infinity, 1);

  // TODO: Make the mappings here more universal
  // map nm: -> node_modules/ to make config smaller
  systemConfig['paths'] = {
    'nm:': 'node_modules/'
  };

  // map nm: -> node_modules/ to make config smaller
  Object.keys(systemConfig['map']).forEach(function (key) {
    systemConfig['map'][key] = systemConfig['map'][key].replace(/^node_modules\//, 'nm:');
  });

  // map nm: -> node_modules/ to make config smaller
  Object.keys(systemConfig['packages']).forEach(function (key) {
    if (key.startsWith('node_modules/')) {
      systemConfig['packages'][key.replace(/^node_modules\//, 'nm:')] = systemConfig['packages'][key];
      delete systemConfig['packages'][key];
    }
  });

  return Promise.resolve(systemConfig);
};

// TODO: This needs to be done better (fails if locations of shit changes)
var mergeCache = exports.mergeCache = function mergeCache(registry, cachedRegistry) {
  return Object.assign({}, registry, cachedRegistry);
};

var fromCache = exports.fromCache = function fromCache(dehydrateCache) {
  return function (_ref21) {
    var tree = _ref21.tree,
        registry = _ref21.registry;

    return dehydrateCache().then(function (cachedRegistry) {
      return { tree: tree, registry: mergeCache(registry, cachedRegistry) };
    });
  };
};

/**
 * Convenience method to allow easy chaining
 * @returns {Promise.<{tree: *, registry: *}>}
 * @param hydrateCache
 */
var toCache = exports.toCache = function toCache(hydrateCache) {
  return function (_ref22) {
    var tree = _ref22.tree,
        registry = _ref22.registry;

    return hydrateCache(registry).then(function () {
      return { tree: tree, registry: registry };
    });
  };
};

var serializeConfig = exports.serializeConfig = function serializeConfig(config) {
  return 'SystemJS.config(' + JSON.stringify(config, null, 2) + ')';
};