/**
 * Copyright 2016 Alexis Vincent (http://alexisvincent.io)
 */
const fs = require('graceful-fs')
const path = require('path')
const Promise = require('bluebird')
const _ = require('lodash')
const {convertPackage} = require('jspm-npm/lib/node-conversion')
const {inspect} = require('util')

const pfs = {}

/**
 * Promisify all fs functions
 */
Object.keys(fs).map(key => {
    if (typeof fs[key] == 'function')
        pfs[key] = Promise.promisify(fs[key]);
})

const log = obj => console.log(inspect(obj, {depth: null}))

/**
 * Get all directories in a directory
 * @param srcpath
 * @returns {Promise.<*>}
 */
const getDirectories = (srcpath) => {
    return pfs.readdir(srcpath).then(
        dirs => Promise.all(dirs.filter((file) => {
            return fs.statSync(path.join(srcpath, file)).isDirectory();
        }))
    );
}

/**
 * For a given dir, get the corresponding package.json
 * @param dir
 * @returns {Promise.<TResult>}
 */
export const getPackageConfig = (dir) => {
    return pfs.readFile(path.join(dir, 'package.json'), 'utf8')
        .then(JSON.parse)
        .then(config => Object.assign({
            dependencies: {},
            devDependencies: {},
            peerDependencies: {}
        }, config))
        .catch(() => null)

}

/**
 * Return the dependencies that live in the first level of node_modules
 * @param packageDir
 * @returns {Promise.<TResult>}
 */
export const getOwnDeps = (packageDir) => {
    const node_modules = path.join(packageDir, 'node_modules')

    return pfs.access(node_modules)
        .then(() => getDirectories(node_modules))
        // Map directories to their package.json
        .then(dirs => Promise.all(dirs.map(dir => getPackageConfig(path.join(packageDir, 'node_modules', dir)))))
        // Filter out anything that wasn't a package
        .then(configs => configs.filter((k, v) => v))

        .catch(err => {
            // console.log(err)
            return []
        })
}

/**
 * Trace the full node_modules tree.
 * @param directory
 * @param name
 * @param version
 * @param registry
 * @returns {Promise.<{tree: *, registry: Array}>}
 */
export const traceModuleTree = (directory, name = false, version = false, registry = []) => {

    return Promise.resolve({name, version})
    // Resolve the package.json and set name and version from there if either is not specified
        .then(({name, version}) => (!name || !version) ? getPackageConfig(directory) : {name, version})

        .then(({name, version}) => (

            // Get the dependencies in node_modules
            getOwnDeps(directory)

            // Merge package { name@version : package.json } into the registry
                .then(ownDeps => {
                    // console.log(ownDeps)
                    ownDeps.forEach((dep => {
                        const versionName = dep.name + '@' + dep.version
                        registry[versionName] = {
                            name: dep.name,
                            config: dep,
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

export const augmentModuleTree = ({tree, registry}) => augmentRegistry(registry).then(registry => ({tree, registry}))

const objectify = (key, array) => {
    return array.reduce((obj, arrayItem) => {
        obj[arrayItem[key]] = arrayItem
        return obj
    }, {})
}

export const augmentRegistry = (registry) => {
    return Promise.all(Object.keys(registry)
        .map(key => {
            const depMap = registry[key]

            return convertPackage(depMap.config, ':' + key, './' + depMap.location, console)
                .then(config => Object.assign({}, depMap, {config}))
        }))
        .then(objectify.bind(null, 'key'))
}

export const pruneRegistry = (registry) => {
    return Promise.resolve(
        objectify('key',
            Object.keys(registry)
                .map(key => {
                        return Object.assign({}, registry[key], {
                            config: _.pick(
                                registry[key].config, [
                                    'meta',
                                    'map'
                                ])
                        })
                    }
                ))
    )

}

export const pruneModuleTree = ({tree, registry}) => pruneRegistry(registry).then(registry => ({tree, registry}))

export const generatePackageListing = ({name, config, key, location}) => {

}

/**
 * Walk the tree (ignores the root)
 * @param tree
 * @param registry
 * @param f
 * @param ignoreRoot
 * @param depth
 * @param skip
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

export const generateConfig = ({tree, registry}) => {
    const systemConfig = {
        "map": {},
        "packages": {}
    }

    // Top level maps
    walkTree({tree, registry}, ({name, config, key, location}, deps) => {
        systemConfig['map'][name] = './' + location
    }, 2, 1)

    // Walk the others and generate package entries
    walkTree({tree, registry}, ({name, config: {map, meta}, key, location}, deps, tree) => {
        // console.log(location)

        const depMappings = {}

        walkTree({tree, registry}, ({name, config, key, location}, deps) => {
            depMappings[name] = './' + location
        }, 2, 1)

        systemConfig['packages']['./' + location] = {
            map: Object.assign({}, map, depMappings),
            meta
        }
    }, Infinity, 1)

    return Promise.resolve(systemConfig)
}

export const serializeConfig = config => {
    return 'SystemJS.config(' + JSON.stringify(config) + ')'
}

const start = new Date().getTime()
//
pfs.readFile('./cache.json', 'utf8')
    .then(JSON.parse)
    .then(generateConfig)
    .then(serializeConfig)
    .then(pfs.writeFile.bind(null, './generated.config.js'))
// .then(config => console.log(inspect(config, {depth: null})))

// traceModuleTree('.')
//     .then(augmentModuleTree)
//     .then(pruneModuleTree)
// .then(generateConfig)
//     .then(config => console.log(inspect(config, {depth: null})))
//     .then(() => console.log((new Date().getTime() - start)/1000 + ' seconds'))
// .then(config => console.log(JSON.stringify(config)))

// getDirectories('./test').then(console.log.bind(console))
// getOwnDeps('./test').then(console.log.bind(console))
// getPackageConfig('.').then(console.log.bind(console))

