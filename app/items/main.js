'use strict'

require('whatwg-fetch')
const dateFormat = require('dateformat')

const item        = document.querySelector('#item')
const image       = document.querySelector('#image img')
const fullSrc     = image.getAttribute('data-full')
const metadataSrc = image.getAttribute('data-metadata')

window.image = image

const metadata    = document.querySelector('#metadata')
let renderMetadata = function() {}

// load metadata
fetch(metadataSrc)
  .then(function(response) {
    return response.json()
  })
  .then(function(metadata) {
    renderMetadata = function() {
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

      if (metadata.coordinates.latitude && metadata.coordinates.longitude) {
        const coord = metadata.coordinates.latitude + ',' + metadata.coordinates.longitude
        const linkUrl = `https://maps.google.com?q=${coord}`
        const imgUrl = `//maps.googleapis.com/maps/api/staticmap?size=400x200&zoom=15&maptype=terrain&format=jpg&markers=${coord}`
        document.querySelector('#metadata .map').href = linkUrl
        document.querySelector('#metadata .map img').src = imgUrl
      } else {
        const element = document.querySelector('#metadata .map')
        if (element) {
          element.remove()
        }
      }

      if (metadata.location.id) {
        document.querySelector('#metadata .location span')
          .textContent = metadata.location.name
      } else {
        const element = document.querySelector('#metadata .location')
        if (element) {
          element.remove()
        }
      }
    }
  })

// events to toggle metadata
image.onclick = function() {
  renderMetadata()
  item.classList.add('metadata')
}

metadata.onclick = function() {
  item.classList.remove('metadata')
}

// zoom
let originalWidth
let originalHeight
let offsetX
let offsetY
let aspectRatio
let zoom
let zoomMin

function zoomToFit() {
  originalWidth  = image.naturalWidth
  originalHeight = image.naturalHeight
  offsetX        = 0
  offsetY        = 0
  aspectRatio    = originalWidth / originalHeight

  let height, width
  if (aspectRatio > 1) {
    zoom = window.innerWidth / originalWidth
    height = Math.round(originalHeight * zoom)
    if (height > window.innerHeight) {
      zoom = window.innerHeight / originalHeight
    }
  } else {
    zoom = window.innerHeight / originalHeight
    width = Math.round(originalWidth * zoom)
    if (width > window.innerWidth) {
      zoom = window.innerWidth / originalwidth
    }
  }

  width   = Math.round(originalWidth * zoom)
  height  = Math.round(originalHeight * zoom)
  zoomMin = zoom
  image.style.width  = `${width}px`
  image.style.height = `${height}px`
}

image.onload = function() {
  zoomToFit()
}

image.onwheel = function(event) {
  if (event.target != image)
    return

  const delta = event.deltaY
  event.preventDefault()

  if (Math.abs(delta) < 1)
    return

  const oldHeight = image.height
  const oldWidth  = image.width

  zoom += delta / 100
  if (zoom < zoomMin) {
    zoom = zoomMin
  }

  let width = Math.round(originalWidth * zoom)
  let height = Math.round(originalHeight * zoom)

  if (width > window.innerWidth) {
    const oldOffsetX = (oldWidth - window.innerWidth) / 2
    const newOffsetX = (width - window.innerWidth) / 2
    offsetX += newOffsetX - oldOffsetX
  } else {
    offsetX = 0
  }

  if (height > window.innerHeight) {
    const oldOffsetY = (oldHeight - window.innerHeight) / 2
    const newOffsetY = (height - window.innerHeight) / 2
    offsetY += newOffsetY - oldOffsetY
  } else {
    offsetY = 0
  }

  image.style.width  = `${width}px`
  image.style.height = `${height}px`
  image.style.top  = `-${offsetY}px`
  image.style.left = `-${offsetX}px`
}

let dragLastY = 0
let dragLastX = 0
let dragging = false

image.ondragstart = function(event) {
  dragLastX = event.clientX
  dragLastY = event.clientY
}

image.onmousedown = function(event) {
  dragLastX = event.x
  dragLastY = event.y
  dragging = true
}

document.onmousemove = function(event) {
  if (!dragging)
    return

  const deltaX = dragLastX - event.x
  const deltaY = dragLastY - event.y

  dragLastX = event.x
  dragLastY = event.y

  offsetY += deltaY
  offsetX += deltaX
  image.style.top  = `-${offsetY}px`
  image.style.left = `-${offsetX}px`

  console.log(deltaX, deltaY)
  event.preventDefault()
  return false
}

document.onmouseup = function(event) {
  if (dragging)
    dragging = false
}


// load fullsize image
const tempImage = new Image()
tempImage.onload = function() {
  image.src = tempImage.src
  zoomToFit()
}
tempImage.src = fullSrc + "?width=" + window.innerWidth + "&height=" + window.innerHeight
