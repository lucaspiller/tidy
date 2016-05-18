"use strict";

const fs        = require('fs-extra')
const path      = require('path')

const Promise   = require('bluebird')
const async     = require('async')
const glob      = Promise.promisify(require('glob'))

const tidy      = require('./tidy')
const models    = require('./models')
const utils     = require('./utils')

var albums = {}

function processAlbum(album, callback) {
  const year = album.timestamp.getFullYear().toString()
  const name = path.basename(album.path)

  const destinationPath = path.join(tidy.config.base, 'Originals', year, name)
  fs.mkdirsSync(destinationPath)

  for (const i in album.files) {
    const sourceFile = album.files[i]
    const destinationFile = path.join(destinationPath, path.basename(sourceFile))

    fs.copySync(sourceFile, destinationFile, { preserveTimestamps: true })
  }

  console.log(name, year, '->', destinationPath)

  callback()
}

function processFile(file, callback) {
  return utils.file.mimeType(file).then(function(mimeType) {
    if (mimeType == undefined) {
      // Ignore unsupported files
      return callback()
    }

    // Get the timestamp
    return utils.timestamp.extract(file).then(function(timestamp) {
      // The album is based upon the directory of the file (we'll strip the
      // path later, for now we use the whole path so two directories with the
      // same name don't end up in the same album)
      const albumPath = path.dirname(file)

      // Create an album in 'albums' if one doesn't exist
      if (albums[albumPath] == undefined) {
        albums[albumPath] = {
          path:      albumPath,
          timestamp: timestamp,
          files:     []
        }
      }

      const album = albums[albumPath]

      // Add our file to it
      album.files.push(file)

      // See if our timestamp is earlier
      if (timestamp < album.timestamp) {
        album.timestamp = timestamp
      }

      callback()
    })
  })
}

function importDirectory(directory) {
  // Check directory exists and is in fact a directory
  if (!fs.existsSync(directory)) {
    utils.cli.fatal(`'${directory}' does not exist`)
  }

  const stats = fs.statSync(directory)
  if (!stats.isDirectory()) {
    utils.cli.fatal(`'${directory}' is not a directory`)
  }

  // Glob it to find all files and albums
  return new Promise(function(resolve) {
    const fileQueue = async.queue(processFile, 1)
    fileQueue.drain = function() {
      resolve(albums)
    }

    const pattern = path.join(directory, '**')

    glob(pattern, {})
      .map(function(file) {
        return fileQueue.push(file)
      })
      .then(function() {
        if (fileQueue.length() == 0) {
          tidy.log.info('No files to process')
          resolve([])
        }
      })
  })

  // Process each album
  .then(function(albums) {
    return new Promise(function(resolve) {
      if (albums.length == 0) {
        return resolve()
      }

      const albumQueue = async.queue(processAlbum, 1)
      albumQueue.drain = function() {
        resolve()
      }

      for (const path in albums) {
        albumQueue.push(albums[path])
      }
    })
  })
}

exports.run = function() {
  if (process.argv.length != 3) {
    console.log("usage: import <directory>")
    process.exit(1)
  }

  const directory = process.argv.slice(2)[0]

  tidy.boot()
    .then(function() {
      return importDirectory(directory)
    })
    .then(utils.cli.gracefulExit)
}
