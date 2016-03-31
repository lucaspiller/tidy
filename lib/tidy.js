/*
 * Tidy (Core)
 *
 * Contains common boot up / initialisation code.
 */
"use strict";

const path = require('path')
const home = require('os-homedir')()
const log  = require('npmlog')

let tidy = module.exports = {}

tidy.root = path.join(__filename, '../..')

tidy.version = '0.0.1'

tidy.config = {
  base: path.join(home, 'Pictures/TidyLibrary')
}

tidy.config.database = {
  client: 'sqlite3',
  connection: {
    filename: path.join(tidy.config.base, 'database.sqlite3')
  },
  useNullAsDefault: true
}

tidy.db = require('knex')(tidy.config.database)

tidy.boot = function() {
  log.info('Running Tidy ' + tidy.version + ' at ' + tidy.root)
  process.chdir(tidy.config.base)
  return tidy.db.migrate.latest({
    database:  tidy.config.database,
    directory: path.join(tidy.root, 'migrations')
  })
}
