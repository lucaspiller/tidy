/*
 * Models
 *
 * Contains models
 */
"use strict";

const tidy      = require('./tidy')
const bookshelf = require('bookshelf')(tidy.db)

class Album extends bookshelf.Model {
  get tableName() {
    return 'albums'
  }

  static findAll() {
    return Album.collection().fetch()
  }

  static findById(id) {
    return new Album({ id: id }).fetch()
  }
}

class Item extends bookshelf.Model {
  get tableName() {
    return 'items'
  }

  static findById(id) {
    return new Item({ id: id }).fetch()
  }

  static findByAlbumId(albumId) {
    return Item.collection().query({ where: { album_id: albumId }}).fetch()
  }
}

module.exports.Album = Album
module.exports.Item  = Item
