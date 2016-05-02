exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.createTable('items', function(table) {
      table.increments('id').primary()
      table.string('path')
      table.string('filename')
      table.string('mime_type')
      table.string('thumbnail_filename')
      table.text('make')
      table.text('model')
      table.integer('exposure')
      table.integer('f_number')
      table.integer('iso')
      table.integer('focal_length')
      table.integer('width')
      table.integer('height')
      table.integer('timestamp')
      table.real('latitude')
      table.real('longitude')
      table.integer('location_id')
      table.text('location_name')
      table.unique(['path', 'filename'])
    })
  ])
}

exports.down = function(knex, Promise) {
  return Promise.all([])
}
