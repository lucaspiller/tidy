/*
 * Whereis
 *
 * Prints the location of an item
 */
"use strict";

const path          = require('path')
const fs            = require('fs')
const child_process = require('child_process')
const cpus          = 2 //require('os').cpus().length

const async   = require('async')
const mkdirp  = require('mkdirp')
const mime    = require('mime')

const tidy    = require('./tidy')
const db      = tidy.db

function whereis() {
  const id = process.argv[2]

  db.select('id', 'path', 'filename').from('items').where({ id: id }).limit(1)
    .then(function(items) {
      if (items.length == 0) {
        console.log('Item not found')
        process.exit(1)
      } else {
        const item = items[0]
        const originalPath = path.join(tidy.config.base, 'Originals', item['path'], item['filename'])
        console.log(originalPath)
        process.exit(0)
      }
    })

}

exports.run = function() {
  if (process.argv.length != 3) {
    console.log("usage: whereis itemid")
    process.exit(1)
  }

  tidy.boot().then(whereis)
}
