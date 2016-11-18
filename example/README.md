# Example Project
This project contains three files, [index.html](./index.html), [app.js](./app.js)
and a [package.json](./package.json) with a `postinstall` hook.

## Prerequisites

Install systemjs-tools (for config generation)

`yarn global add systemjs-tools`

`yarn global add serve` for a static file server (or another one if you prefer)

Everytime we do a `yarn add`, we will need to regenerate the config.
There is a `postinstall` hook to do this for you, but if you notice 
anything strange, just run `systemjs config` in the `package.json` directory.

Note that until recently Yarn didn't respect `postinstall` hooks, so either
upgrade Yarn or run `systemjs config` separately.

## Basic install 

Install dependencies

`yarn add systemjs systemjs-nodelibs react react-dom`

Serve the current directory at http://localhost:3000

`serve .`               

## Augment the installation to support ES6 (using babel)

***Update app.js to be ES6 version***

Add babel plugin

`yarn add systemjs-plugin-babel`

***Update index file to use new transpiler***

Serve the current directory at http://localhost:3000

`serve .`                    
