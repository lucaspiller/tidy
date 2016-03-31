"use strict";

const path    = require('path')

const express = require('express')
const log     = require('npmlog')
const gm      = require('gm').subClass({ imageMagick: true })

const tidy    = require('./tidy')
const models  = require('./models')

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
      focalLength: this.item['focal_length'],
      timestamp:   this.item['timestamp'],
      coordinates: {
        latitude:  this.item['latitude'],
        longitude: this.item['longitude']
      },
      location: {
        id:   this.item['location_id'],
        name: this.item['location_name']
      }
    }
  }
}

let app = express()
app.locals.pretty = true
app.use(express.static('public'))
app.set('view engine', 'jade')

app.get('/', function(req, res) {
  let albums = []

  return models.Album.findAll()
    .map(function(album) {
      return new AlbumDecorator(album)
    })
    .then(function(albums) {
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
    log.info("Listening on port 3000")
  })
}

exports.run = function() {
  tidy.boot().then(startServer)
}
