"use strict";

const path    = require('path')
const home    = require('os-homedir')()

const express = require('express')
const log     = require('npmlog')
const gm      = require('gm').subClass({ imageMagick: true })

let tidy = {}

tidy.root = path.join(__filename, '../..')

tidy.version = '0.0.1'
log.info('Running Tidy ' + tidy.version + ' at ' + tidy.root)

tidy.config = {
  base: path.join(home, 'Pictures/TidyLibrary')
}

tidy.config.database = {
  dialect: 'sqlite3',
  connection: {
    filename: path.join(tidy.config.base, 'database.sqlite3')
  }
}

class AlbumDecorator {
  constructor(album) {
    this.album = album
  }

  get id() {
    return this.album['id']
  }

  get name() {
    return this.album['path']
  }

  get url() {
    return `/albums/${this.id}`
  }
}

class ItemDecorator {
  constructor(item) {
    this.item = item
  }

  get id() {
    return this.item['id']
  }

  get url() {
    return `/items/${this.id}`
  }

  get thumbnailUrl() {
    return `/items/${this.id}/thumb`
  }

  get fullUrl() {
    return `/items/${this.id}/full`
  }

  get metadataUrl() {
    return `/items/${this.id}/metadata`
  }

  get originalPath() {
    return path.join(tidy.config.base, 'Originals', this.item['path'], this.item['filename'])
  }

  get thumbnailPath() {
    if (this.item['thumbnail_filename'])
    {
      return path.join(tidy.config.base, 'Thumbnails', this.item['path'], this.item['thumbnail_filename'])
    }
  }

  get metadata() {
    return {
      width:       this.item['width'],
      height:      this.item['height'],
      make:        this.item['make'],
      model:       this.item['model'],
      exposure:    this.item['exposure'],
      fNumber:     this.item['f_number'],
      iso:         this.item['iso'],
      focalLength: this.item['focal_length']
    }
  }
}

const db = require('knex')(tidy.config.database)

let app = express()
app.locals.pretty = true
app.use(express.static('public'))
app.set('view engine', 'jade')

app.get('/', function(req, res) {
  let albums = []

  return db.select('*').from('albums')
    .map(function(album) {
      return new AlbumDecorator(album)
    })
    .then(function(albums) {
      res.render('index', {
        albums: albums
      });
    });
})

app.get('/albums/:id', function(req, res) {
  return db.select('*').from('albums').where({ id: req.params.id })
    .then(function(albums) {
      const album = new AlbumDecorator(albums[0])

      return db.select('*').from('items').where({ album_id: album.id })
        .map(function(item) {
          return new ItemDecorator(item)
        })
        .then(function(items) {
          res.render('album', {
            album: album,
            items: items
          })
        })
    })
})

app.get('/items/:id', function(req, res) {
  return db.select('*').from('items').where({ id: req.params.id })
    .then(function(items) {
      const item = new ItemDecorator(items[0])

      res.render('item', {
        item: item
      })
    })
})

app.get('/items/:id/metadata', function(req, res) {
  return db.select('*').from('items').where({ id: req.params.id })
    .then(function(items) {
      const item = new ItemDecorator(items[0])
      res.json(item.metadata)
    })
})

app.get('/items/:id/original', function(req, res) {
  return db.select('*').from('items').where({ id: req.params.id })
    .then(function(items) {
      const item = new ItemDecorator(items[0])
      res.sendFile(item.originalPath, {})
    })
})

app.get('/items/:id/full', function(req, res) {
  return db.select('*').from('items').where({ id: req.params.id })
    .then(function(items) {
      const item = new ItemDecorator(items[0])
      const width  = req.query.width || 1000
      const height = req.query.height || 1000
      gm(item.originalPath)
        .autoOrient()
        .noProfile()
        .resize(width, height, '^')
        .unsharp(0.5)
        .interlace('plane')
        .quality(100)
        .stream('jpeg')
        .pipe(res)
    })
})

app.get('/items/:id/thumb', function(req, res) {
  return db.select('*').from('items').where({ id: req.params.id })
    .then(function(items) {
      const item = new ItemDecorator(items[0])
      if (item.thumbnailPath) {
        res.sendFile(item.thumbnailPath, {})
      } else {
        res.status(404).send('Thumbnail not created')
      }
    })
})

function startServer() {
  app.listen(3000, function() {
    log.info("Listening on port 3000")
  })
}

exports.run = function() {
  db.migrate.latest({
    database:  tidy.config.database,
    directory: path.join(tidy.root, 'migrations')
  }).then(startServer)
}
