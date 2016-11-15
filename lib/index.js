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
});

/**
 * Get all directories in a directory
 * @param srcpath
 * @returns {Promise.<*>}
 */
function getDirectories(srcpath) {
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
        .then(dirs => Promise.all(dirs.map(dir => getPackageConfig(path.join(packageDir, 'node_modules', dir)))))
        .catch(err => [])
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

export const generateConfig = ({tree, registry}) => {
    return {tree, registry}
}


traceModuleTree('./')
    .then(augmentModuleTree)
    .then(pruneModuleTree)
    .then(generateConfig)
    .then(config => console.log(inspect(config, {depth: null})))
// .then(config => console.log(JSON.stringify(config)))


// getOwnDeps('.').then(console.log.bind(console))
// getPackageConfig('.').then(console.log.bind(console))

