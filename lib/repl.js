require("babel-polyfill");

requireU = m => {
  delete require.cache[require.resolve(m)]
  return require(require.resolve(m))
}