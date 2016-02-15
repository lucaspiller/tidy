exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('items', function(table) {
      table.string('make')
      table.string('model')
      table.integer('exposure')
      table.integer('f_number')
      table.integer('iso')
      table.integer('focal_length')
      table.integer('width')
      table.integer('height')
      table.integer('timestamp')
      table.real('latitude')
      table.real('longitude')
    })
  ])
}

exports.down = function(knex, Promise) {
  return Promise.all([])
}
