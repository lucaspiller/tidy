const fs      = require('fs')

const Promise = require('bluebird')
const exif    = Promise.promisify(require('exif').ExifImage)

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
function extractExifTimestamp(exifData, path) {
  return new Promise(function(resolve) {
    const timestring = exifData.exif.DateTimeOriginal || exifData.exif.DateTime
    if (timestring) {
      const parts = timestring.split(' ')
      const date = parts[0].split(":").join("-")
      const time = parts[1]
      try {
        const timestamp = Date.parse(date + 'T' + time + 'Z') / 1000
        return resolve(timestamp)
      } catch(e) {
        // Ignore an invalid date
      }
    }

    // Fallback to the basic method if we haven't returned a result
    extractBasicTimestamp(path)
      .then(function(timestamp) {
        return resolve(timestamp)
      })
  })
}

// Extracts the mtime from the file, which should be when the picture was taken
// if it hasn't been modified. The ctime is updated when permissions are
// changed, so is likely to have changed when the file was copied from the
// camera.
function extractBasicTimestamp(path) {
  return new Promise(function(resolve, reject) {
    fs.stat(path, function(err, result) {
      if (err) {
        return reject(err)
      }

      return resolve(result.mtime.getTime() / 1000)
    })
  })
}

// Attempts extract the timestamp from the EXIF metadata, or if that fails, the
// file mtime. Resolves a Javascript date object.
exports.extract = function(path) {
  return new exif({ image: path })
    .then(function(exifData) {
      return extractExifTimestamp(exitData, path)
    })
    .catch(function(_error) {
      // Probably not a JPEG file
      return extractBasicTimestamp(path)
    })
    .then(function(timestamp) {
      // Convert to a Javascript date
      return new Date(timestamp * 1000)
    })
}

exports.extractExifTimestamp = extractExifTimestamp
exports.extractBasicTimestamp = extractBasicTimestamp
