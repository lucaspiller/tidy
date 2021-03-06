/*
 * Metadata Extractor
 *
 * The metadata extractor extracts metadata from images and the sidebar YAML
 * file. It also updates the sidebar file with missing data.
 */
"use strict";

const Promise    = require('bluebird')
const path       = require('path')
const cpus       = require('os').cpus().length

const async      = require('async')
const exif       = Promise.promisify(require('exif').ExifImage)
const dms2dec    = require('dms2dec')
const gm         = require('gm').subClass({ imageMagick: true })

const tidy       = require('./tidy')
const models     = require('./models')
const db         = tidy.db
const utils      = require('./utils')

const geocoder = require('offline-geocoder')({ database: path.join(tidy.root, 'data/geodata.db') })

// Extract dimensions from exif, falling back to basic extractor if they aren't
// available
function extractExifDimensions(exifData, path) {
  return new Promise(function(resolve) {
    let width  = exifData.exif.ExifImageWidth  || exifData.image.ExifImageWidth || exifData.image.ImageWidth
    let height = exifData.exif.ExifImageHeight || exifData.image.ExifImageHeight || exifData.image.ImageHeight

    if (width && height) {
      resolve({
        width: width,
        height: height
      })
    } else {
      // We couldn't extract the width of height, so fallback to the basic
      // extractor
      return extractBasicDimensions(path)
        .then(function(dimensions) {
          resolve(dimensions)
        })
    }
  })
  .then(function(dimensions) {
    // Switch the width/height based on the exif orientation flag if
    // present
    if (exifData.image.Orientation && exifData.image.Orientation > 4) {
      const tmp         = dimensions.width
      dimensions.width  = dimensions.height
      dimensions.height = tmp
    }

    return dimensions
  })
}

// Attempt to parse GPS data. Returns an array, where the first element is the
// latitude and the second is the longitude.
function extractExifCoordinates(exifData) {
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

function exifExtractor(path) {
  return new exif({ image: path })
    .then(function(exifData) {
      return Promise.join(
        utils.timestamp.extractExifTimestamp(exifData, path),
        extractExifDimensions(exifData, path),
        function(timestamp, dimensions) {
          // Assign other values - if these are undefined it doesn't matter,
          // they'll just be set as null in the database
          let result = {
            timestamp:    timestamp,
            width:        dimensions.width,
            height:       dimensions.height,
            make:         exifData.image.Make,
            model:        exifData.image.Model,
            exposure:     Math.round(1 / exifData.exif.ExposureTime),
            f_number:     exifData.exif.FNumber,
            iso:          exifData.exif.ISO,
            focal_length: exifData.exif.FocalLength
          }

          // Extract the coordinates and reverse the location name
          const coordinates = extractExifCoordinates(exifData)
          if (coordinates.length == 2 && (coordinates[0] != 0 && coordinates[1] != 0)) {
            result.latitude  = coordinates[0]
            result.longitude = coordinates[1]
            return geocoder.reverse(coordinates[0], coordinates[1])
              .then(function(location) {
                // Add the location to the metadata and result the result
                result.location_id   = location.id
                result.location_name = location.formatted
                return result
              })
              .catch(function(error) {
                tidy.log.error(originalPath + ": " + error)
                return result
              })
          } else {
            // No coordinates, so just return the result
            return result
          }
      })
    })
    .catch(function(error) {
      tidy.log.error(path + ": " + error)
      return basicExtractor(path)
    })
}

// Extracts the dimensions from the file using ImageMagic. Compared to
// extracting the data from EXIF this is slow, and also doesn't take into
// account the camera orientation, however it supports all file formats
// ImageMagick supports.
function extractBasicDimensions(path) {
  return new Promise(function(resolve, reject) {
    gm(path)
      .identify(function(err, result) {
        if (err) {
          reject(err)
        }

        resolve({
          width: result.size.width,
          height: result.size.height
        })
      })
  })
}

function basicExtractor(path) {
  return Promise.join(
    utils.timestamp.extractBasicTimestamp(path),
    extractBasicDimensions(path),
    function(timestamp, dimensions) {
      return {
        timestamp: timestamp,
        width:     dimensions.width,
        height:    dimensions.height
      }
  })
}

function extractorForMimeType(mimeType) {
  switch(mimeType) {
    case 'image/jpeg':
      return exifExtractor
      break
    default:
      return basicExtractor
  }
}

function extractMetadataItem(item, callback) {
  const originalPath = path.join(tidy.config.base, 'Originals', item['path'], item['filename'])
  const extractor = extractorForMimeType(item['mime_type'])
  extractor(originalPath)
    .then(function(metadata) {
      return db.table('items').where({ id: item['id'] })
        .update(metadata)
    })
    .then(function() {
      return callback()
    })
    .catch(function(error) {
      tidy.log.error('Error processing ' + item['id'] + ' ' + originalPath + ": " + error)
      return callback()
    })
}

function extractMetadata() {
  return new Promise(function(resolve, reject) {
    tidy.log.info("Extracting metadata...")

    const queue = async.queue(extractMetadataItem, 1)
    queue.drain = resolve

    db.select('id', 'path', 'filename', 'mime_type').from('items')
      .map(function(item) {
        return queue.push(item)
      })
      .then(function() {
        if (queue.length() == 0) {
          tidy.log.info('No items to process')
          return resolve()
        }
      })
  })
}

function updateStats(tag, callback) {
  return tag.updateStats()
    .then(function() {
      return callback()
    })
    .catch(function(error) {
      tidy.log.error(error)
      return callback()
    })
}

function updateTagStats() {
  return new Promise(function(resolve, reject) {
    tidy.log.info("Updating tags stats cache...")

    const queue = async.queue(updateStats, cpus * 2)
    queue.drain = resolve

    models.Tag.findAll()
      .map(function(tag) {
        return queue.push(tag)
      })
      .then(function() {
        if (queue.length() == 0) {
          tidy.log.info('No tags to process')
          resolve()
        }
      })
  })
}

exports.run = function() {
  tidy.boot()
    .then(extractMetadata)
    .then(updateTagStats)
    .then(function() {
      console.log('Done!')
      process.exit(0)
    })
}
