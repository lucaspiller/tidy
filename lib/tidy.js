/*
 * Tidy (Core)
 *
 * Contains common boot up / initialisation code.
 */
"use strict";

const path    = require('path')

const home    = require('os-homedir')()
const Promise = require('bluebird')

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
tidy.db.on('query', function(query) {
  if (query.bindings) {
    tidy.log.verbose('DB', query.sql, query.bindings)
  } else {
    tidy.log.verbose('DB', query.sql)
  }
})

const bootPwd = Promise.method(function() {
  process.chdir(tidy.config.base)
})

const bootLogger = Promise.method(function() {
  tidy.log = require('npmlog')
  tidy.log.level = (process.env['DEBUG'] == '1') ? 'verbose' : 'info'
  tidy.log.info('Running Tidy ' + tidy.version + ' at ' + tidy.root)
})

const bootDatabase = function() {
  return tidy.db.migrate.latest({
    database:  tidy.config.database,
    directory: path.join(tidy.root, 'migrations')
  })
}

tidy.boot = function() {
  return bootPwd()
    .then(bootLogger)
    .then(bootDatabase)
}
