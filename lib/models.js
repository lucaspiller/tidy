/*
 * Models
 *
 * Contains models
 */
"use strict";

const Promise   = require('bluebird')

const tidy      = require('./tidy')
const bookshelf = require('bookshelf')(tidy.db)
const knex      = require('knex')

class Item extends bookshelf.Model {
  get tableName() {
    return 'items'
  }

  static findById(id) {
    return new Item({ id: id }).fetch()
  }

  static paginateAll(page, per_page) {
    const limit  = per_page
    const offset = (page - 1) * per_page

    return Item.collection()
      .query(function(qb) {
        qb.limit(limit).offset(offset).orderBy('timestamp', 'desc')
      })
      .fetch()
      .then(function(collection) {
        return collection.models
      })
  }

  static findOrCreateByPathAndFileName(path, fileName) {
    const record = new Item({ path: path, filename: fileName })
    return record.fetch().then(function() {
      if (record.isNew()) {
        return record.save()
      } else {
        return record
      }
    }).catch(function(error) {
      console.trace(error)
      process.exit(1)
    })
  }
}

class Tag extends bookshelf.Model {
  static findOrCreate(type, name) {
    const record = new Tag({ type: 'album', name: name })
    return record.fetch().then(function() {
      if (record.isNew()) {
        return record.save()
      } else {
        return record
      }
    }).catch(function(error) {
      console.trace(error)
      process.exit(1)
    })
  }

  static findAll() {
    return Tag.collection()
      .fetch()
      .then(function(collection) {
        return collection.models
      })
  }

  static paginateAll(page, per_page) {
    const limit  = per_page
    const offset = (page - 1) * per_page

    return Tag.collection()
      .query(function(qb) {
        qb.limit(limit).offset(offset).orderBy('newest_timestamp', 'desc')
      })
      .fetch()
      .then(function(collection) {
        return collection.models
      })
  }

  static findById(id) {
    return new Tag({ id: id }).fetch()
  }

  get tableName() {
    return 'tags'
  }

  get itemsCollection() {
    return this.belongsToMany(Item, 'taggings')
  }

  items(page, per_page) {
    const limit  = per_page
    const offset = (page - 1) * per_page

    return this.itemsCollection
      .query(function(qb) {
        qb.limit(limit).offset(offset).orderBy('timestamp')
      })
      .fetch()
      .then(function(collection) {
        return collection.models
      })
  }

  addItem(item) {
    return Tagging.findOrCreate(item, this)
  }

  updateStats() {
    const tag = this
    return tidy.db('taggings').innerJoin('items', 'taggings.item_id', 'items.id').where('taggings.tag_id', tag.id)
      .select(knex.raw(
        'COUNT(items.id) AS item_count, MIN(timestamp) AS oldest_timestamp, MAX(timestamp) AS newest_timestamp'
      ))
      .then(function(rows) {
        const stats = rows[0]
        return tag.save(rows[0])
      })
  }
}

class Tagging extends bookshelf.Model {
  get tableName() {
    return 'taggings'
  }

  static findOrCreate(item, tag) {
    const record = new Tagging({ item_id: item.get('id'), tag_id: tag.get('id') })
    return record.fetch().then(function(result) {
      if (result == null) {
        return record.save()
      } else {
        return record
      }
    }).catch(function(error) {
      console.trace(error)
      process.exit(1)
    })
  }
}

class Album extends Tag {
  static previewImage(albumId) {
    return new Album({ id: albumId }).itemsCollection.fetchOne()
  }

  static findOrCreateByName(name) {
    return Album.findOrCreate('album', name)
  }
}

module.exports.Item    = Item
module.exports.Tag     = Tag
module.exports.Tagging = Tagging
module.exports.Album   = Album
