/*
 * Thumbnailer
 *
 * The thumbnailer creates thumbnails
 */
"use strict";

const path          = require('path')
const fs            = require('fs')
const child_process = require('child_process')
const cpus          = 2 //require('os').cpus().length

const promise = require('bluebird')
const async   = require('async')
const log     = require('npmlog')
const mkdirp  = require('mkdirp')
const mime    = require('mime')

const tidy    = require('./tidy')
const db      = tidy.db

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

function fileExists(file) {
  try {
    return fs.statSync(file).isFile()
  } catch(e) {
    return false
  }
}

function thumbnailItem(item, callback) {
  // check it's an image
  const originalPath = path.join(tidy.config.base, 'Originals', item['path'], item['filename'])
  const mimeType     = mime.lookup(originalPath)

  // skip processing if it's not an image
  if (imageMimeTypes.indexOf(mimeType) == -1) {
    return callback()
  }

  const thumbnailDirectory = path.join(tidy.config.base, 'Thumbnails', item['path'])
  const thumbnailFilename  = path.basename(item['filename'], path.extname(item['filename'])) + '.jpeg'
  const thumbnailPath      = path.join(thumbnailDirectory, thumbnailFilename)

  // skip processing if it already exists
  if (fileExists(thumbnailPath)) {
    db.table('items').where({ id: item['id'] }).update({ thumbnail_filename: thumbnailFilename })
      .catch(function(error) {
        log.error(error)
      })
    return callback()
  }

  // do the conversion
  mkdirp.sync(thumbnailDirectory)
  const cmd = 'convert "' + originalPath + '" -define jpeg:size=800x800 -format jpeg -quality 75 -thumbnail 400x -auto-orient -unsharp 0x.5 -interlace Plane "' + thumbnailPath + '"'
  return child_process.exec(cmd, {}, function() {
    // check we actually created it
    if (fileExists(thumbnailPath)) {
      db.table('items').where({ id: item['id'] }).update({ thumbnail_filename: thumbnailFilename })
        .catch(function(error) {
          log.error(error)
        })
    } else {
      log.warn("Failed to convert " + originalPath + " to " + thumbnailPath + ":\n" + cmd)
    }

    callback()
  })
}

function thumbnailAlbum(album, callback) {
  log.info('Processing ', album['path'])

  let imageQueue = async.queue(thumbnailItem, 1)
  imageQueue.drain = function() {
    return callback()
  }

  db.select('id', 'path', 'filename').from('items').where({ album_id: album['id'] })
    .map(function(item) {
      return imageQueue.push(item)
    })
}


function startThumbnailer() {
  let albumQueue = async.queue(thumbnailAlbum, cpus)
  albumQueue.drain = function() {
    console.log('Done!')
    process.exit(0)
  }

  return db.select('id', 'path').from('albums')
    .map(function(album) {
      return albumQueue.push(album)
    })
    .then(function() {
      if (imageQueue.length() == 0) {
        return callback()
      }
    })
}

exports.run = function() {
  tidy.boot().then(startThumbnailer)
}
