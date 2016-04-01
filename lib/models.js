/*
 * Models
 *
 * Contains models
 */
"use strict";

const Promise   = require('bluebird')

const tidy      = require('./tidy')
const bookshelf = require('bookshelf')(tidy.db)

class Album extends bookshelf.Model {
  get tableName() {
    return 'albums'
  }

  get tag() {
    return Tag.findOrCreate('album', this.get('name'))
  }

  items() {
    return this.tag.then(function(tag) {
      return tag.items().fetch()
    })
  }

  addItem(item) {
    return this.tag.then(function(tag) {
      return Tagging.findOrCreate(item, tag)
    })
  }

  static findAll() {
    return Album.collection().fetch()
  }

  static findById(id) {
    return new Album({ id: id }).fetch()
  }

  static findOrCreateByName(name) {
    const record = new Album({ name: name })
    return record.fetch().then(function() {
      if (record.isNew()) {
        return record.save()
      } else {
        return record
      }
    }).catch(function(error) {
      return record.refresh()
    })
  }
}

class Item extends bookshelf.Model {
  get tableName() {
    return 'items'
  }

  static findById(id) {
    return new Item({ id: id }).fetch()
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
  get tableName() {
    return 'tags'
  }

  items() {
    return this.belongsToMany(Item, 'taggings')
  }

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

module.exports.Album   = Album
module.exports.Item    = Item
module.exports.Tag     = Tag
module.exports.Tagging = Tagging
