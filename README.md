# SystemJS Config Builder
Generate SystemJS config files from node_modules

### This project is currently experimental and shouldn't be relied on in production

## Overview
The easiest way to include modules in SystemJS is *currently* through JSPM. This project aims to provide an alternative, by leveraging the deterministic installs of Yarn and generating config files to explain to SystemJS how to resolve modules from `node_modules`.
