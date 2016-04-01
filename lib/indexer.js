/*
 * Indexer
 *
 * The indexer reads a photo library and recreates the internal database.
 */
"use strict";

const path    = require('path')

const Promise = require('bluebird')
const async   = require('async')
const glob    = Promise.promisify(require('glob'))
const mime    = require('mime')

const tidy    = require('./tidy')
const models  = require('./models')

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
  const albumName = path.basename(filePath)

  let album = models.Album.findOrCreateByName(albumName)
  let item  = models.Item.findOrCreateByPathAndFileName(filePath, fileName)

  return Promise.join(album, item, function(album, item) {
    item.set('mime_type', mimeType)
    return item.save()
      .then(function() {
        return album.addItem(item)
          .then(function() {
            tidy.log.info(filePath + ', ' + fileName + ' -> Album ' + album.id + ', Item ' + item.id)
          })
      })
  }).catch(function(error) {
    console.trace(error)
    process.exit(1)
  })
}

function processFile(file, callback) {
  let mimeType = mime.lookup(file)
  if (imageMimeTypes.indexOf(mimeType) != -1) {
    let filePath = path.relative('Originals', path.dirname(file))
    let fileName = path.basename(file)
    return createOrUpdateItem(filePath, fileName, mimeType)
      .then(callback)
  } else {
    return callback()
  }
}

const pattern = 'Originals/**'

function startIndexer() {
  tidy.log.info('start!')

  let imageQueue = async.queue(processFile, 1)
  imageQueue.drain = function() {
    console.log('Done!')
    process.exit(0)
  }

  glob(pattern, {})
    .map(function(file) {
      return imageQueue.push(file)
    })
    .then(function() {
      if (imageQueue.length() == 0) {
        console.log('Done!')
        process.exit(0)
      }
    })
}

exports.run = function() {
  tidy.boot().then(startIndexer)
}
