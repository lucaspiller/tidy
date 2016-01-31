exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.createTable('albums', function(table) {
      table.increments('id')
      table.string('path').unique()
    }),
    knex.schema.createTable('items', function(table) {
      table.increments('id')
      table.integer('album_id')
      table.string('path')
      table.string('filename')
      table.string('mime_type')
    })
  ])
}

exports.down = function(knex, Promise) {
  return Promise.all([])
}
