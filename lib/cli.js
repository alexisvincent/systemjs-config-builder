import {
    traceModuleTree,
    fromCache,
    augmentModuleTree,
    pruneModuleTree,
    toCache,
    generateConfig,
    serializeConfig
} from './index'
import {inspect} from 'util';

const fs = require('graceful-fs')
const path = require('path')
const Promise = require('bluebird')

const pfs = {}

/**
 * Promisify all fs functions
 */
Object.keys(fs).map(key => {
    if (typeof fs[key] == 'function')
        pfs[key] = Promise.promisify(fs[key]);
})

const log = obj => {
    console.log(inspect(obj, {depth: null}))
    return obj
}

traceModuleTree('.')
    .then(fromCache)
    .then(augmentModuleTree)
    .then(toCache)
    .then(pruneModuleTree)
    .then(generateConfig)
    // .then(log)
    .then(serializeConfig)
    .then(pfs.writeFile.bind(null, './generated.config.js'));
