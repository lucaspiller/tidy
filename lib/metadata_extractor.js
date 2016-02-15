/*
 * Metadata Extractor
 *
 * The metadata extractor extracts metadata from images and the sidebar YAML
 * file. It also updates the sidebar file with missing data.
 */
"use strict";

const path          = require('path')
const fs            = require('fs')
const child_process = require('child_process')
const home          = require('os-homedir')()
const cpus          = 2 //require('os').cpus().length

const promise = require('bluebird')
const async   = require('async')
const log     = require('npmlog')
const exif    = promise.promisify(require('exif').ExifImage)

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

let exifMimeTypes = [
  'image/jpeg'
]

function fileExists(file) {
  try {
    return fs.statSync(file).isFile()
  } catch(e) {
    return false
  }
}

function extractMetadataItem(item, callback) {
  const originalPath = path.join(tidy.config.base, 'Originals', item['path'], item['filename'])

  return (new exif({ image: originalPath }))
    .then(function(exifData) {
      db.table('items').where({ id: item['id'] })
        .update({
          make:         exifData.image.Make,
          model:        exifData.image.Model,
          exposure:     Math.round(1 / exifData.exif.ExposureTime),
          f_number:     exifData.exif.FNumber,
          iso:          exifData.exif.ISO,
          focal_length: exifData.exif.FocalLength,
          width:        exifData.exif.ExifImageWidth,
          height:       exifData.exif.ExifImageHeight
        })
        .catch(function(error) {
          log.error(error)
        })
      return callback()
    })
    .catch(function(error) {
      log.error(error)
      return callback()
    })
}

function extractMetadataAlbum(album, callback) {
  log.info('Processing ', album['path'])

  let imageQueue = async.queue(extractMetadataItem, 1)
  imageQueue.drain = function() {
    return callback()
  }

  db.select('id', 'path', 'filename').from('items').where({ album_id: album['id'] }).where('mime_type', 'in', exifMimeTypes)
    .map(function(item) {
      return imageQueue.push(item)
    })
    .then(function() {
      if (imageQueue.length() == 0) {
        return callback()
      }
    })
}

function startMetadataExtractor() {
  let albumQueue = async.queue(extractMetadataAlbum, cpus)
  albumQueue.drain = function() {
    console.log('Done!')
    process.exit(0)
  }

  return db.select('id', 'path').from('albums')
    .map(function(album) {
      return albumQueue.push(album)
    })
}

exports.run = function() {
  process.chdir(tidy.config.base);
  db.migrate.latest({
    database:  tidy.config.database,
    directory: path.join(tidy.root, 'migrations')
  }).then(startMetadataExtractor)
}