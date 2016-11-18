'use strict';

var _index = require('./index');

var _util = require('util');

var fs = require('graceful-fs');
var path = require('path');
var Promise = require('bluebird');

var pfs = {};

/**
 * Promisify all fs functions
 */
Object.keys(fs).map(function (key) {
    if (typeof fs[key] == 'function') pfs[key] = Promise.promisify(fs[key]);
});

var log = function log(obj) {
    console.log((0, _util.inspect)(obj, { depth: null }));
    return obj;
};

(0, _index.traceModuleTree)('.').then(_index.fromCache).then(_index.augmentModuleTree).then(_index.toCache).then(_index.pruneModuleTree).then(_index.generateConfig)
// .then(log)
.then(_index.serializeConfig).then(pfs.writeFile.bind(null, './generated.config.js'));