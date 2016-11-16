# SystemJS Config Builder 
Generate SystemJS config files from node_modules
## [Experimental]

## Overview
The easiest way to include modules in SystemJS is *currently* through JSPM. This project aims to provide an alternative, by leveraging the deterministic installs of Yarn and generating config files to explain to SystemJS how to resolve modules from `node_modules`.

## Progress
### It works :D (Needs JSPM for the @node polyfills)
#### See [#1](https://github.com/alexisvincent/systemjs-config-builder/issues/1) for plans to not need JSPM anymore
Currently, given this [package.json](https://github.com/alexisvincent/systemjs-config-builder/blob/master/test/package.json), 
SystemJS Config Builder generates this [config](https://github.com/alexisvincent/systemjs-config-builder/blob/master/test/generated.config.js).
