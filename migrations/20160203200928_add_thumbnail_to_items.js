exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('items', function(table) {
      table.string('thumbnail_filename')
      table.index('album_id')
      table.unique(['path', 'filename'])
    })
  ])
}

exports.down = function(knex, Promise) {
  return Promise.all([])
}
