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
const cpus          = 2 //require('os').cpus().length

const promise = require('bluebird')
const async   = require('async')
const log     = require('npmlog')
const exif    = promise.promisify(require('exif').ExifImage)
const dms2dec = require('dms2dec')

const tidy    = require('./tidy')
const models  = require('./models')
const db      = tidy.db

const geocoder = require('offline-geocoder')({ database: path.join(tidy.root, 'data/geodata.db') })

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

// Attempt to parse the EXIF timestamp, if it exists. Returns a unix timestamp.
//
// This will be the local time of whatever the camera was set to, which is
// probably the best for displaying. There may also be GPSDateStamp and
// GPSTimeStamp which should be in UTC, but aren't always.
//
// The timestamp is stored as '2012:11:28 17:40:18' which Date.parse can't
// parse on it's own, so we need to fudge it. We add 'Z' when parsing to ensure
// we don't alter the date, otherwise Node will add the timezone offset of the
// host machine.
function extractTimestamp(exifData) {
  const timestamp = exifData.exif.DateTimeOriginal || exifData.exif.DateTime
  if (timestamp) {
    const parts = timestamp.split(' ')
    const date = parts[0].split(":").join("-")
    const time = parts[1]
    try {
      return Date.parse(date + 'T' + time + 'Z') / 1000
    } catch(e) {
      // Ignore an invalid date
    }
  }
}

// Attempt to parse GPS data. Returns an array, where the first element is the
// latitude and the second is the longitude.
function extractCoordinates(exifData) {
  if (exifData.gps.GPSLatitude && exifData.gps.GPSLatitudeRef &&
        exifData.gps.GPSLongitude && exifData.gps.GPSLongitudeRef) {
    return dms2dec(exifData.gps.GPSLatitude, exifData.gps.GPSLatitudeRef,
             exifData.gps.GPSLongitude, exifData.gps.GPSLongitudeRef)
  } else {
    // return an empty array so coordinates[0] just returns undefined instead of
    // raising an exception
    return []
  }
}

function extractMetadataItem(item, callback) {
  const originalPath = path.join(tidy.config.base, 'Originals', item['path'], item['filename'])

  return (new exif({ image: originalPath }))
    .then(function(exifData) {
      const timestamp   = extractTimestamp(exifData)
      const coordinates = extractCoordinates(exifData)

      if (coordinates.length == 2 && (coordinates[0] != 0 && coordinates[1] != 0)) {
        geocoder.reverse(coordinates[0], coordinates[1])
          .then(function(location) {
            return db.table('items').where({ id: item['id'] })
              .update({
                location_id:   location.id,
                location_name: location.formatted
              })
          })
          .catch(function(error) {
            log.error(error)
          })
      }

      let width  = exifData.exif.ExifImageWidth
      let height = exifData.exif.ExifImageHeight

      // Switch the width/height based on the orientation
      if (exifData.image.Orientation && exifData.image.Orientation > 4) {
        height = exifData.exif.ExifImageWidth
        width  = exifData.exif.ExifImageHeight
      }

      return db.table('items').where({ id: item['id'] })
        .update({
          make:          exifData.image.Make,
          model:         exifData.image.Model,
          exposure:      Math.round(1 / exifData.exif.ExposureTime),
          f_number:      exifData.exif.FNumber,
          iso:           exifData.exif.ISO,
          focal_length:  exifData.exif.FocalLength,
          width:         width,
          height:        height,
          timestamp:     timestamp,
          latitude:      coordinates[0],
          longitude:     coordinates[1]
        })
    })
    .then(function() {
      return callback()
    })
    .catch(function(error) {
      log.error(error)
      return callback()
    })
}

function updateStats(tag, callback) {
  return tag.updateStats()
    .then(function() {
      return callback()
    })
    .catch(function(error) {
      log.error(error)
      return callback()
    })
}

function updateTagStats() {
  log.info("Updating tags stats cache...")

  let queue = async.queue(updateStats, 1)
  queue.drain = function() {
    console.log('Done!')
    process.exit(0)
  }

  return models.Tag.findAll()
    .map(function(tag) {
      return queue.push(tag)
    })
}

function startMetadataExtractor() {
  let imageQueue = async.queue(extractMetadataItem, 1)
  imageQueue.drain = updateTagStats

  db.select('id', 'path', 'filename').from('items').where('mime_type', 'in', exifMimeTypes)
    .map(function(item) {
      return imageQueue.push(item)
    })
    .then(function() {
      if (imageQueue.length() == 0) {
        console.log('Done!')
        process.exit(0)
      }
    })
}

exports.run = function() {
  tidy.boot().then(startMetadataExtractor)
}
