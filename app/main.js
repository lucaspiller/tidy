require('./styles/theme.css')
require('./styles/index.scss')
require('./styles/album.scss')
require('./styles/item.scss')

document.addEventListener("DOMContentLoaded", function() {
  const path = location.pathname

  if (path.match(/^\/albums\/[0-9]+$/i)) {
    // albums page
    require('./albums/main.js')
  } else if (path.match(/^\/items\/[0-9]+$/i)) {
    // items page
  } else if (path.match(/^\/$/i)) {
    // index page
  }
})
