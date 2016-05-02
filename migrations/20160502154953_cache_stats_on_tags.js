exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('tags', function(table) {
      table.integer('item_count')
      table.integer('oldest_timestamp')
      table.integer('newest_timestamp')
    })
  ])
}
exports.down = function(knex, Promise) {
  return Promise.all([])
}
