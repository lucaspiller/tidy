"use strict";

const path      = require('path')

const express   = require('express')
const gm        = require('gm').subClass({ imageMagick: true })
const onHeaders = require('on-headers')

const tidy      = require('./tidy')
const models    = require('./models')

class AlbumDecorator {
  constructor(album) {
    this.album = album
  }

  get id() {
    return this.album.get('id')
  }

  get name() {
    // FIXME we should do this when importing albums
    return this.album.get('name').replace(/_/g, ' ')
  }

  get url() {
    return `/api/albums/${this.id}`
  }

  get minDate() {
    return new Date(this.album.get('oldest_timestamp') * 1000).toISOString()
  }

  get maxDate() {
    return new Date(this.album.get('newest_timestamp') * 1000).toISOString()
  }

  get itemCount() {
    return this.album.get('item_count')
  }

  toIndexJSON() {
    return {
      id:         this.id,
      name:       this.name,
      url:        this.url,
      itemsCount: this.itemCount,
      minDate:    this.minDate,
      maxDate:    this.maxDate
    }
  }

  toShowJSON(items) {
    return {
      id:         this.id,
      name:       this.name,
      url:        this.url,
      items:      items,
      itemsCount: this.itemCount,
      minDate:    this.minDate,
      maxDate:    this.maxDate
    }
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
    return `/api/items/${this.id}`
  }

  get thumbnailUrl() {
    return `/api/items/${this.id}/thumb`
  }

  get fullUrl() {
    return `/api/items/${this.id}/full`
  }

  get metadataUrl() {
    return `/api/items/${this.id}/metadata`
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

  get aspectRatio() {
    return this.item.get('width') / this.item.get('height')
  }

  get timestamp() {
    return new Date(this.item.get('timestamp') * 1000).toISOString()
  }

  toIndexJSON() {
    return {
      id:           this.id,
      url:          this.url,
      thumbnailUrl: this.thumbnailUrl,
      fullUrl:      this.fullUrl,
      aspectRatio:  this.aspectRatio,
      timestamp:    this.timestamp
    }
  }

  toShowJSON() {
    return {
      id:           this.id,
      url:          this.url,
      thumbnailUrl: this.thumbnailUrl,
      fullUrl:      this.fullUrl,
      aspectRatio:  this.aspectRatio,
      timestamp:    this.timestamp,
      metadata:     this.metadata
    }
  }
}

let app = express()
app.locals.pretty = true

app.use(function(req, res, next) {
  const startTime = new Date()

  onHeaders(res, function() {
    const duration = Date.now() - startTime
    tidy.log.info('http', `Completed ${req.method} ${req.url} with ${res.statusCode} in ${duration}ms`)
  })

  next()
})

app.get('/api/albums', function(req, res) {
  const page        = parseInt(req.query.page)     || 1
  const per_page    = parseInt(req.query.per_page) || 50
  const nextPageUrl = `${req.protocol}://${req.get('host')}/api/albums?page=${page + 1}`

  return models.Album.paginateAll(page, per_page)
    .map(function(album) {
      return new AlbumDecorator(album).toIndexJSON()
    })
    .then(function(albums) {
      res.send({
        albums: albums,
        nextPageUrl: nextPageUrl
      })
    })
})

app.get('/api/albums/:id', function(req, res) {
  return models.Album.findById(req.params.id)
    .then(function(record) {
      const album = new AlbumDecorator(record)

      const page        = parseInt(req.query.page)     || 1
      const per_page    = parseInt(req.query.per_page) || 250
      const nextPageUrl = `${req.protocol}://${req.get('host')}/api/albums/${req.params.id}?page=${page + 1}`

      return record.items(page, per_page)
        .then(function(collection) {
          const items = collection.map( record => new ItemDecorator(record).toIndexJSON() )
          return album.toShowJSON(items)
        })
        .then(function(json) {
          res.send({
            album:       json,
            nextPageUrl: nextPageUrl
          })
        })
    })
})

app.get('/api/albums/:id/thumb', function(req, res) {
  return models.Album.previewImage(req.params.id)
    .then(function(record) {
      const item = new ItemDecorator(record)
      if (item.thumbnailPath) {
        res.sendFile(item.thumbnailPath, {})
      } else {
        res.status(404).send('Thumbnail not created')
      }
    })
})

app.get('/api/items', function(req, res) {
  const page        = parseInt(req.query.page)     || 1
  const per_page    = parseInt(req.query.per_page) || 250
  const nextPageUrl = `${req.protocol}://${req.get('host')}/api/items?page=${page + 1}`

  return models.Item.paginateAll(page, per_page)
    .map(function(item) {
      return new ItemDecorator(item).toIndexJSON()
    })
    .then(function(items) {
      res.send({
        items: items,
        nextPageUrl: nextPageUrl
      })
    })
})

app.get('/api/items/:id', function(req, res) {
  return models.Item.findById(req.params.id)
    .then(function(record) {
      const item = new ItemDecorator(record)
      res.send({ item: item.toShowJSON() })
    })
})

app.get('/api/items/:id/original', function(req, res) {
  return models.Item.findById(req.params.id)
    .then(function(record) {
      const item = new ItemDecorator(record)
      res.sendFile(item.originalPath, {})
    })
})

app.get('/api/items/:id/full', function(req, res) {
  const width  = req.query.width || 1000
  const height = req.query.height || 1000
  const etag   = `item-${req.params.id}-full-${width}-${height}`
  if (req.headers['if-none-match'] == etag) {
    return res.status(304).end()
  }

  return models.Item.findById(req.params.id)
    .then(function(record) {
      const item = new ItemDecorator(record)
      res.set('Etag', etag)
      res.set('Content-Type', 'image/jpeg')
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

app.get('/api/items/:id/thumb', function(req, res) {
  const etag = `item-${req.params.id}-thumb`
  if (req.headers['if-none-match'] == etag) {
    return res.status(304).end()
  }

  return models.Item.findById(req.params.id)
    .then(function(record) {
      const item = new ItemDecorator(record)
      if (item.thumbnailPath) {
        res.set('Etag', etag)
        res.sendFile(item.thumbnailPath, {})
      } else {
        res.status(404).send('Thumbnail not created')
      }
    })
})

function startServer() {
  app.listen(3000, function() {
    tidy.log.info('http', 'Listening on port 3000')
  })
}

exports.run = function() {
  tidy.boot().then(startServer)
}
