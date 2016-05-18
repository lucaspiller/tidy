const Promise   = require('bluebird')
const mime      = require('mime')

const imageMimeTypes = [
  'image/bmp',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/pjpeg',
  'image/tiff',
  'image/webp',
  'image/x-tiff',
  'image/x-windows-bmp'
]

// Returns a promise that resolves to the mime type of the file.
// If the mime type is not supported by Tidy, it will resolve undefined.
exports.mimeType = function(file) {
  return new Promise(function(resolve) {
    const mimeType = mime.lookup(file)

    if (imageMimeTypes.indexOf(mimeType) == -1) {
      resolve(undefined)
    } else {
      resolve(mimeType)
    }
  })
}


exports.timestamp = function(file) {

}
