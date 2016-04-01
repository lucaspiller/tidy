"use strict";

const path    = require('path')

const express = require('express')
const gm      = require('gm').subClass({ imageMagick: true })

const tidy    = require('./tidy')
const models  = require('./models')

class AlbumDecorator {
  constructor(album) {
    this.album = album
  }

  get id() {
    return this.album.get('id')
  }

  get name() {
    return this.album.get('path')
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
    return this.item.get('id')
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
    return path.join(tidy.config.base, 'Originals', this.item.get('path'), this.item.get('filename'))
  }

  get thumbnailPath() {
    if (this.item.get('thumbnail_filename'))
    {
      return path.join(tidy.config.base, 'Thumbnails', this.item.get('path'), this.item.get('thumbnail_filename'))
    }
  }

  get metadata() {
    return {
      width:       this.item.get('width'),
      height:      this.item.get('height'),
      make:        this.item.get('make'),
      model:       this.item.get('model'),
      exposure:    this.item.get('exposure'),
      fNumber:     this.item.get('f_number'),
      iso:         this.item.get('iso'),
      focalLength: this.item.get('focal_length'),
      timestamp:   this.item.get('timestamp'),
      coordinates: {
        latitude:  this.item.get('latitude'),
        longitude: this.item.get('longitude')
      },
      location: {
        id:   this.item.get('location_id'),
        name: this.item.get('location_name')
      }
    }
  }
}

let app = express()
app.locals.pretty = true
app.use(express.static('public'))
app.set('view engine', 'jade')

app.get('/', function(req, res) {
  return models.Album.findAll()
    .then(function(collection) {
      const albums = collection.map( record => new AlbumDecorator(record) )
      res.render('index', {
        albums: albums
      })
    })
})

app.get('/albums/:id', function(req, res) {
  return models.Album.findById(req.params.id)
    .then(function(record) {
      const album = new AlbumDecorator(record)

      return models.Item.findByAlbumId(album.id)
        .then(function(collection) {
          const items = collection.map( record => new ItemDecorator(record) )
          res.render('album', {
            album: album,
            items: items
          })
        })
    })
})

app.get('/items/:id', function(req, res) {
  return models.Item.findById(req.params.id)
    .then(function(record) {
      const item = new ItemDecorator(record)
      res.render('item', {
        item: item
      })
    })
})

app.get('/items/:id/metadata', function(req, res) {
  return models.Item.findById(req.params.id)
    .then(function(record) {
      const item = new ItemDecorator(record)
      res.json(item.metadata)
    })
})

app.get('/items/:id/original', function(req, res) {
  return models.Item.findById(req.params.id)
    .then(function(record) {
      const item = new ItemDecorator(record)
      res.sendFile(item.originalPath, {})
    })
})

app.get('/items/:id/full', function(req, res) {
  return models.Item.findById(req.params.id)
    .then(function(record) {
      const item = new ItemDecorator(record)
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
  return models.Item.findById(req.params.id)
    .then(function(record) {
      const item = new ItemDecorator(record)
      if (item.thumbnailPath) {
        res.sendFile(item.thumbnailPath, {})
      } else {
        res.status(404).send('Thumbnail not created')
      }
    })
})

function startServer() {
  app.listen(3000, function() {
    tidy.log.info("Listening on port 3000")
  })
}

exports.run = function() {
  tidy.boot().then(startServer)
}
