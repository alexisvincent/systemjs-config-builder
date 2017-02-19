"use strict";

require("babel-polyfill");

requireU = function requireU(m) {
  delete require.cache[require.resolve(m)];
  return require(require.resolve(m));
};