'use strict'

require('whatwg-fetch')
const dateFormat = require('dateformat')

const image       = document.querySelector('#image img')
const fullSrc     = image.getAttribute('data-full')
const metadataSrc = image.getAttribute('data-metadata')

const metadata    = document.querySelector('#metadata')

// load metadata
fetch(metadataSrc)
  .then(function(response) {
    return response.json()
  })
  .then(function(metadata) {
    if (metadata.timestamp) {
      const date = new Date(metadata.timestamp * 1000)
      const formatted = dateFormat(date, "mmmm dS yyyy")
      document.querySelector('#metadata .taken span')
        .textContent = formatted
    }

    if (metadata.width && metadata.height) {
      let mp = (metadata.width * metadata.height) / 1000000
      if (mp >= 2) {
        mp = Math.floor(mp)
      } else {
        mp = Math.floor(mp * 10) / 10
      }
      const dimensions = `${metadata.width} x ${metadata.height} (${mp} MP)`
      document.querySelector('#metadata .dimensions span')
        .textContent = dimensions
    }

    if (metadata.make) {
      document.querySelector('#metadata .make span')
        .textContent = metadata.make
    }
    if (metadata.model) {
      document.querySelector('#metadata .model span')
        .textContent = metadata.model
    }

    if (metadata.fNumber) {
      document.querySelector('#metadata .aperture span')
        .textContent = 'f/' + metadata.fNumber
    }
    if (metadata.exposure) {
      document.querySelector('#metadata .exposure span')
        .textContent = '1/' + metadata.exposure
    }

    if (metadata.focalLength) {
      document.querySelector('#metadata .focal-length span')
        .textContent = metadata.focalLength + 'mm'
    }
    if (metadata.iso) {
      document.querySelector('#metadata .iso span')
        .textContent = metadata.iso
    }

    if (metadata.latitude && metadata.longitude) {
      const coord = metadata.latitude + ',' + metadata.longitude
      const linkUrl = `https://maps.google.com?q=${coord}`
      const imgUrl = `//maps.googleapis.com/maps/api/staticmap?size=400x200&zoom=15&maptype=terrain&format=jpg&markers=${coord}`
      document.querySelector('#metadata .map').href = linkUrl
      document.querySelector('#metadata .map img').src = imgUrl
    } else {
      document.querySelector('#metadata .map').remove()
    }
  })

// load fullsize image
const tempImage = new Image()
tempImage.onload = function() {
  image.src = tempImage.src
}
tempImage.src = fullSrc + "?width=" + window.innerWidth + "&height=" + window.innerHeight

// events
image.onclick = function() {
  metadata.classList.remove('hidden')
}

metadata.onclick = function() {
  metadata.classList.add('hidden')
}
