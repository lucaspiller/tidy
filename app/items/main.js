const item = document.querySelector('img.item')
const fullSrc = item.getAttribute('data-full')

const tempImage = new Image()
tempImage.onload = function() {
  item.src = tempImage.src
}
tempImage.src = fullSrc + "?width=" + window.innerWidth + "&height=" + window.innerHeight
