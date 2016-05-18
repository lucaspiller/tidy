/*
 * Thumbnailer
 *
 * The thumbnailer creates thumbnails
 */
"use strict";

const path          = require('path')
const fs            = require('fs-extra')
const child_process = require('child_process')

const async   = require('async')
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
    return db.table('items').where({ id: item['id'] }).update({ thumbnail_filename: thumbnailFilename })
      .then(callback)
      .catch(function(error) {
        tidy.log.error(error)
      })
  }

  // do the conversion
  fs.mkdirsSync(thumbnailDirectory)
  const cmd = 'convert "' + originalPath + '" -define jpeg:size=800x800 -format jpeg -quality 75 -thumbnail 400x -auto-orient -unsharp 0x.5 -interlace Plane "' + thumbnailPath + '"'
  return child_process.exec(cmd, {}, function() {
    // check we actually created it
    if (fileExists(thumbnailPath)) {
      db.table('items').where({ id: item['id'] }).update({ thumbnail_filename: thumbnailFilename })
        .catch(function(error) {
          tidy.log.error(error)
        })
    } else {
      tidy.log.warn("Failed to convert " + originalPath + " to " + thumbnailPath + ":\n" + cmd)
    }

    callback()
  })
}

function startThumbnailer() {
  let imageQueue = async.queue(thumbnailItem, 1)
  imageQueue.drain = function() {
    console.log('Done!')
    process.exit(0)
  }

  db.select('id', 'path', 'filename').from('items').where({ thumbnail_filename: null })
    .map(function(item) {
      return imageQueue.push(item)
    })
    .then(function(items) {
      if (imageQueue.length() == 0) {
        console.log('Done!')
        process.exit(0)
      }
    })
}

exports.run = function() {
  tidy.boot()
    .then(startThumbnailer)
}
