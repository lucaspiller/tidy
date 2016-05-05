/*
 * Tagger
 *
 * The tagger computes 'smart tags' based upon the item metadata.
 */
"use strict";

const Promise    = require('bluebird')
const path       = require('path')
const cpus       = require('os').cpus().length

const async      = require('async')

const tidy       = require('./tidy')
const models     = require('./models')
const db         = tidy.db

const geocoder = require('offline-geocoder')({ database: path.join(tidy.root, 'data/geodata.db') })

function computeTags(item, callback) {
  const location = geocoder.location().find(item.get('location_id'))
    .then(function(location) {
      let countryTag
      let locationTag

      if (location && location.country) {
        countryTag = models.Tag.findOrCreate('country', location.country.id)
          .then(function(tag) {
            return models.Tagging.findOrCreate(item, tag)
          })
      }

      if (location && location.id) {
        locationTag = models.Tag.findOrCreate('location', location.id)
          .then(function(tag) {
            return models.Tagging.findOrCreate(item, tag)
          })
      }

      return Promise.all([
        countryTag,
        locationTag,
      ])
    })

  return Promise.all([
    location
  ])
  .then(function() {
    return callback()
  })
}

function tagger() {
  return new Promise(function(resolve, reject) {
    tidy.log.info("Computing tags...")

    const queue = async.queue(computeTags, 1)
    queue.drain = resolve

    models.Item.findAll()
      .map(function(item) {
        return queue.push(item)
      })
      .then(function() {
        if (queue.length() == 0) {
          tidy.log.info('No items to process')
          return resolve()
        }
      })
  })
}

function updateStats(tag, callback) {
  return tag.updateStats()
    .then(function() {
      return callback()
    })
    .catch(function(error) {
      tidy.log.error(error)
      return callback()
    })
}

function updateTagStats() {
  return new Promise(function(resolve, reject) {
    tidy.log.info("Updating tags stats cache...")

    const queue = async.queue(updateStats, cpus * 2)
    queue.drain = resolve

    models.Tag.findAll()
      .map(function(tag) {
        return queue.push(tag)
      })
      .then(function() {
        if (queue.length() == 0) {
          tidy.log.info('No tags to process')
          resolve()
        }
      })
  })
}
exports.run = function() {
  tidy.boot()
    .then(tagger)
    .then(updateTagStats)
    .then(function() {
      console.log('Done!')
      process.exit(0)
    })
}
