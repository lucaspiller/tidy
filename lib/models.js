/*
 * Models
 *
 * Contains models
 */
"use strict";

const tidy = require('./tidy')
const db   = tidy.db

const returnFirstOrNull = function(records) {
  if (records.length == 0) {
    return null
  } else {
    return records[0]
  }
}

class Album {
  static findAll() {
    return db.select('*').from('albums')
  }

  static findById(id) {
    return db.select('*').from('albums').where({ id: id }).limit(1)
      .then(returnFirstOrNull)
  }
}

class Item {
  static findById(id) {
    return db.select('*').from('items').where({ id: id }).limit(1)
      .then(returnFirstOrNull)
  }

  static findByAlbumId(albumId) {
    return db.select('*').from('items').where({ album_id: albumId })
  }
}

module.exports.Album = Album
module.exports.Item  = Item
