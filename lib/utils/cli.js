exports.fatal = function(error) {
  console.error('fatal: ' + error)
  process.exit(1)
}

exports.gracefulExit = function(tidy) {
  process.exit(0)
}
