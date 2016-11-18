# Example Project
This project contains two files, [index.html](./index.html) and [app.js](./app.js).

## Prerequisites

Install systemjs-tools (for config generation)

`yarn global add systemjs-tools`

## Basic install 

Initialise package.json

`yarn init -y`                 

Install dependencies

`yarn add systemjs systemjs-nodelibs react react-dom`

Generate the SystemJS config file from node_modules

`systemjs config`         

Serve the current directory at http://localhost:3000

`serve .`               

## Augment the installation to support ES6 (using babel)

***Update app.js to be ES6 version***

Add babel plugin

`yarn add systemjs-plugin-babel`

Regenerate config

`systemjs config`

***Update index file to use new transpiler***

Serve the current directory at http://localhost:3000

`serve .`                    
