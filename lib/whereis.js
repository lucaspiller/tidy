/*
 * Whereis
 *
 * Prints the location of an item
 */
"use strict";

const path      = require('path')

const tidy      = require('./tidy')
const db        = tidy.db
const utils     = require('./utils')

function whereis() {
  const id = process.argv[2]

  return db.select('id', 'path', 'filename').from('items').where({ id: id }).limit(1)
    .then(function(items) {
      if (items.length == 0) {
        utils.cli.fatal(`item '${id}' not found`)
      } else {
        const item = items[0]
        const originalPath = path.join(tidy.config.base, 'Originals', item['path'], item['filename'])
        console.log(originalPath)
      }
    })

}

exports.run = function() {
  if (process.argv.length != 3) {
    console.log("usage: whereis <itemid>")
    process.exit(1)
  }

  tidy.boot()
    .then(whereis)
    .then(utils.cli.gracefulExit)
}
