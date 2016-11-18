//import {render} from 'react-dom'
var render = require('react-dom').render
//import {DOM} from 'react'
var DOM = require('react').DOM

render( DOM.div({}, "hello there"), document.getElementById('root') )
