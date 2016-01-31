/*
 * Indexer
 *
 * The indexer reads a photo library and recreates the internal database.
 */
"use strict";

const path    = require('path')
const home    = require('os-homedir')()

const promise = require('bluebird')
const log     = require('npmlog')
const glob    = promise.promisify(require('glob'))
const mime    = require('mime')

let tidy = {}

tidy.root = path.join(__filename, '../..')

tidy.version = '0.0.1'
log.info('Running Tidy ' + tidy.version + ' at ' + tidy.root)

tidy.config = {
  base: path.join(home, 'Pictures/TidyLibrary')
}

tidy.config.database = {
  dialect: 'sqlite3',
  connection: {
    filename: path.join(tidy.config.base, 'database.sqlite3')
  }
}

const db = require('knex')(tidy.config.database)

let pattern = 'Originals/**'
let imageMimeTypes = [
  'image/bmp',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/pjpeg',
  'image/tiff',
  'image/webp',
  'image/x-tiff',
  'image/x-windows-bmp'
]

function createOrUpdateItem(filePath, fileName, mimeType) {
  return db.raw("INSERT OR IGNORE INTO albums(path) VALUES(?)", [ filePath ])
    .then(function() {
      return db.select('id').from('albums').where({ path: filePath }).limit(1)
    })
    .then(function(ids) {
      return ids[0].id
    }).then(function(albumId) {
      return db.select('id').from('items').where({ path: filePath, filename: fileName }).limit(1)
        .then(function(ids) {
          if (ids.length == 0) {
            return db.insert({ path: filePath, filename: fileName, album_id: albumId, mime_type: mimeType }).into('items').returning('id')
          } else {
            return ids[0].id
          }
        }).then(function(id) {
          log.info(filePath + ', ' + fileName + ' -> Album ' + albumId + ', Item ' + id)
        }).catch(function(error) {
          console.trace(error);
        });
    }).catch(function(error) {
      console.trace(error);
    });
}

function startIndexer() {
  log.info('start!')

  glob(pattern, {})
    .map(function(file) {
      let mimeType = mime.lookup(file);
      if (imageMimeTypes.indexOf(mimeType) != -1) {
        let filePath = path.relative('Originals', path.dirname(file))
        let fileName = path.basename(file)
        return createOrUpdateItem(filePath, fileName, mimeType)
      }
    })
    .then(function() {
      log.info('Done!')
      process.exit(0)
    })
}

exports.run = function() {
  process.chdir(tidy.config.base);
  db.migrate.latest({
    database:  tidy.config.database,
    directory: path.join(tidy.root, 'migrations')
  }).then(startIndexer)
}
