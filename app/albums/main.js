const Masonry = require('masonry-layout')
const imagesLoaded = require('imagesloaded')
const throttle = require('lodash/throttle')

var container = document.querySelector('.items')

var msnry = new Masonry(container, {
  itemSelector: '.item',
  percentPosition: true
})

var updateLayout = throttle(function() {
  msnry.layout()
}, 100)

var imgLoad = imagesLoaded(container)
imgLoad.on('progress', function(instance, image) {
  if (image.isLoaded && image.img) {
    // 'highlight' random images that are wider than they are high
    if (image.img.naturalWidth > image.img.naturalHeight) {
      if (Math.random() < 0.1) {
        var item = image.img.parentNode.parentNode
        item.classList.add('item-w2')
      }
    }
  } else {
    // delete failed items
    image.img.parentNode.parentNode.remove()
  }

  updateLayout()
})

imgLoad.on('always', function() {
  msnry.layout()
})
