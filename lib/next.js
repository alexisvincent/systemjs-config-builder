/**
 * Copyright 2016 Alexis Vincent (http://alexisvincent.io)
 */
const fs = require('mz/fs')
const path = require('path').posix
const Promise = require('bluebird')
const _ = require('lodash')
const semver = require('semver')
const {convertPackage} = require('jspm-npm/lib/node-conversion')
const {inspect} = require('util')

export const nodeCoreModules = [
  'assert',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'constants',
  'crypto',
  'dgram',
  'dns',
  'domain',
  'events',
  'fs',
  'http',
  'https',
  'module',
  'net',
  'os',
  'path',
  'process',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  'string_decoder',
  'sys',
  'timers',
  'tls',
  'tty',
  'url',
  'util',
  'vm',
  'zlib'
];


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

const log = obj => console.log(inspect(obj, {depth: null}))

/**
 * Get all directories in a directory
 * @param srcpath
 * @returns {Promise.<*>}
 */
const getDirectories = (srcpath) => {
  return Promise.resolve(fs.readdir(srcpath).then(
    files => files.filter((file) => {
      return fs.statSync(path.join(srcpath, file)).isDirectory();
    }).map(dir => path.join(srcpath, dir))
  ))
}

const isPackageDirectory = async(dir) => {
  return await fs.exists(path.join(dir, 'package.json'))
}

/**
 * For a given dir, get the corresponding package.json
 * @param dir
 * @returns {Promise.<TResult>}
 */
export const getPJSON = (dir) => {
  return fs.readFile(path.join(dir, 'package.json'), 'utf8')
    .then(JSON.parse)
    // Pad it with defaults
    .then(pjson => ({
        dependencies: {},
        devDependencies: {},
        peerDependencies: {},

        ...pjson,

        _augmented: false,
        _locations: [dir],
        _key: `${pjson.name}@${pjson.version}`
      }),
    ).catch(() => false)
}

/**
 * Return the dependencies that live in the first level of node_modules
 * @param packageDir
 * @returns {Promise.<TResult>}
 */
export const getOwnDepsDEPRECATED = (packageDir) => {
  const node_modules = path.join(packageDir, 'node_modules')

  return fs.access(node_modules)
    .then(() => getDirectories(node_modules))
    // Map directories to their package.json
    .then(dirs => Promise.all(dirs.map(dir => getPJSON(path.join(packageDir, 'node_modules', dir)))))
    // Filter out anything that wasn't a package
    .then(configs => configs.filter((v, k) => v))

    .catch(err => {
      // console.log(err)
      return []
    })
}

export const test = async() => {

  console.log(
    Object.values(addPackagesToRegistry({}, await getAllSubPackages('.').map(getPJSON)))
      .filter(entry => entry._locations.length > 1)

  )


  // console.log(subdir)
}

export const getSubPackageDirectories = async(packageDir) => {
  const node_modules = path.join(packageDir, 'node_modules')

  if (await fs.exists(node_modules)) {

    // Check if node_modules itself is a package (apparently node thought this was a good idea)
    if (await isPackageDirectory(node_modules)) return [node_modules]
    else {

      const dirs = await getDirectories(node_modules).map(async(dir) => {
        // If directory contains a package, return it
        if (await isPackageDirectory(dir)) return Promise.resolve([dir])
        // For any that aren't packages themselves check if they're scoped and have children
        else return getDirectories(dir).filter(isPackageDirectory)
      })

      return Promise.resolve([].concat.apply([], dirs))
    }
  } else return Promise.resolve([])
}

export const getAllSubPackages = async(directory) => {
  const subPackages = getSubPackageDirectories(directory)
    .map(async(dir) => {
      return [
        dir,
        ...(await getAllSubPackages(dir))
      ]
    })

  return Promise.resolve([].concat.apply([], await subPackages))
}

export const addPackagesToRegistry = (registry, packages) => {

  // TODO: This can be made significantly faster by not doing it one by one
  // Should take advantage of the fact that we have been given a list
  const addPackageToRegistry = (registry, pjson) => {
    const existingEntry = registry[pjson._key] || {
        _locations: [],
        _augmented: false
      }

    // merge the two entries, preferring the one that is augmented, then the new one
    let entry = {
      ...(!existingEntry._augmented ? existingEntry : pjson),
      ...(existingEntry._augmented ? existingEntry : pjson),
      _locations: _.uniq([...existingEntry._locations, ...pjson._locations])
    }

    return {
      ...registry,
      [entry._key]: entry
    }
  }

  return packages.reduce(addPackageToRegistry, {})
}


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
export const traceModuleTree = (directory, name = false, version = false, registry = {}) => {

  return Promise.resolve({name, version})
  // Resolve the package.json and set name and version from there if either is not specified
    .then(({name, version}) => (!name || !version) ? getPJSON(directory) : {name, version})

    .then(({name, version}) => (

      // Get the dependencies in node_modules
      getOwnDepsDEPRECATED(directory)

      // Merge package { name@version : package.json } into the registry
        .then(ownDeps => {
          // console.log(ownDeps)
          ownDeps.forEach((dep => {
            const versionName = dep.name + '@' + dep.version
            registry[versionName] = {
              name: dep.name,
              config: dep,
              version: dep.version,
              key: versionName,
              location: path.join(directory, 'node_modules', dep.name)
            }
          }))

          return ownDeps
        })

        .then(ownDeps => {
          // map each package.json to it's own tree
          return Promise.all(ownDeps.map(({name, version}) => {
            return traceModuleTree(path.join(directory, 'node_modules', name), name, version, registry)
            // Drop the registry
              .then(({tree, registry}) => tree)
            // map the module and its dep list to a tree entry
          })).then(deps => ({name, deps, version: version}))
        })

        .then(tree => ({tree, registry}))
    ))
}

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
const objectify = (key, array) => {
  return array.reduce((obj, arrayItem) => {
    obj[arrayItem[key]] = arrayItem
    return obj
  }, {})
}

/**
 * Given a registry of package.json files, use jspm/npm to augment them to be SystemJS compatible
 * @param registry
 * @returns {Promise.<TResult>}
 */
export const augmentRegistry = (registry) => {
  return Promise.all(Object.keys(registry)
    .map(key => {
      const depMap = registry[key]

      // Don't augment things that already have been (from the cache)
      let shouldAugment = !depMap.augmented

      // Don't augment things that specify config.jspmPackage
      if (depMap.config.jspmPackage != undefined && depMap.config.jspmPackage)
        shouldAugment = false

      // Don't augment things that specify config.jspmNodeConversion == false
      if (depMap.config.jspmNodeConversion !== undefined && !depMap.config.jspmNodeConversion)
        shouldAugment = false

      // Don't augment things that specify config.jspm.jspmNodeConversion == false
      if (depMap.config.jspm !== undefined
        && depMap.config.jspm.jspmNodeConversion !== undefined
        && !depMap.config.jspm.jspmNodeConversion)
        shouldAugment = false

      // Augment the package.json
      return shouldAugment ?
        convertPackage(depMap.config, ':' + key, './' + depMap.location, console)
          .then(config => Object.assign(depMap, {config, augmented: true}))
          .catch(log) :
        depMap
    }))
    .then(objectify.bind(null, 'key'))
}

/**
 * Convenience method to allow easy chaining
 * @param tree
 * @param registry
 */
export const augmentModuleTree = ({tree, registry}) => augmentRegistry(registry).then(registry => ({tree, registry}))

/**
 * Only keep keys we are interested in for package config generation
 * @param registry
 * @returns {Promise.<*>}
 */
export const pruneRegistry = (registry) => {
  return Promise.resolve(
    objectify('key',
      Object.keys(registry)
        .map(key => {
            return Object.assign({}, registry[key], {
              config: _.pick(
                registry[key].config, [
                  'meta',
                  'map',
                  'main',
                  'format',
                  'defaultExtension',
                  'defaultJSExtensions'
                ])
            })
          }
        ))
  )
}

/**
 * Convenience method to allow easy chaining
 * @param tree
 * @param registry
 */
export const pruneModuleTree = ({tree, registry}) => pruneRegistry(registry).then(registry => ({tree, registry}))

/**
 * Walk the tree, call f on all nodes.
 * @param tree
 * @param registry
 * @param f - (versionName, deps, tree)
 * @param depth - How deep should we go
 * @param skip - How many levels should we skip
 */
export const walkTree = ({tree, registry}, f, depth = Infinity, skip = 0) => {
  if (depth >= 1) {
    const {name, deps, version} = tree

    if (skip <= 0)
      f(registry[name + '@' + version], deps, tree)

    if (depth >= 2)
      deps.forEach(tree => walkTree({tree, registry}, f, depth - 1, skip - 1))
  }
}

/**
 * resolve the package registry entry that should be used given
 * @param packageName - name of package to resolve
 * @param semverRange - acceptable version range
 * @param dir - directory the caller lives in
 * @param registry - registry object
 */
const resolvePackage = (packageName, semverRange, dir, registry) => {
  return Object.Values(registry)
    .filter(({name}) => name == registry)
    .filter(({version}) => semver.satisfies(version, semverRange))
    .filter(({location}) => {
      location.split('/').indexOf('node_modules')
    })
}

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
export const generateConfig = ({tree, registry}) => {

  const systemConfig = {
    "map": {},
    "packages": {}
  }

  // get readable stream working
  // TODO: Fix this hack
  systemConfig['map']["_stream_transform"] = "node_modules/readable-stream/transform"

  // Walk first level of dependencies and map package name to location
  walkTree({tree, registry}, ({name, config, key, location}, deps) => {
    systemConfig['map'][name] = location
  }, 2, 1)

  // Walk full dep tree and assign package config entries
  walkTree({tree, registry}, ({name, config, key, location}, deps, tree) => {

    // Construct package entry based off config
    let packageEntry = Object.assign({
      map: {},
      meta: {}
    }, config)

    // Add mappings for it's deps.
    walkTree({tree, registry}, ({name, config, key, location}, deps) => {
      packageEntry['map'][name] = location
    }, 2, 1)

    // If there are no mappings, don't pollute the config
    if (Object.keys(packageEntry['map']).length == 0)
      delete packageEntry['map']

    // Assign package entry to config
    systemConfig['packages'][location] = packageEntry

    // Add mappings for all jspm-nodelibs
    // TODO: Fix this hack
    nodeCoreModules.forEach(lib => {
      systemConfig['map'][lib] = "node_modules/jspm-nodelibs-" + lib
    })

  }, Infinity, 1)

  // TODO: Make the mappings here more universal
  // map nm: -> node_modules/ to make config smaller
  systemConfig['paths'] = {
    'nm:': 'node_modules/'
  }

  // map nm: -> node_modules/ to make config smaller
  Object.keys(systemConfig['map']).forEach(key => {
    systemConfig['map'][key] = systemConfig['map'][key].replace(/^node_modules\//, 'nm:')
  })

  // map nm: -> node_modules/ to make config smaller
  Object.keys(systemConfig['packages']).forEach(key => {
    if (key.startsWith('node_modules/')) {
      systemConfig['packages'][key.replace(/^node_modules\//, 'nm:')] = systemConfig['packages'][key]
      delete systemConfig['packages'][key]
    }
  })

  return Promise.resolve(systemConfig)
}

// TODO: This needs to be done better (fails if locations of shit changes)
export const mergeCache = (registry, cachedRegistry) => {
  return Object.assign({}, registry, cachedRegistry)
}

export const fromCache = (dehydrateCache) => ({tree, registry}) => {
  return dehydrateCache().then(cachedRegistry => {
    return {tree, registry: mergeCache(registry, cachedRegistry)}
  })
}

/**
 * Convenience method to allow easy chaining
 * @returns {Promise.<{tree: *, registry: *}>}
 * @param hydrateCache
 */
export const toCache = (hydrateCache) => ({tree, registry}) => {
  return hydrateCache(registry)
    .then(() => ({tree, registry}))
}

export const serializeConfig = config => {
  return 'SystemJS.config(' + JSON.stringify(config, null, 2) + ')'
}

