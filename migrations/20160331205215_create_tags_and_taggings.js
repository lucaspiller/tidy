exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.createTable('tags', function(table) {
      table.increments('id').primary()
      table.string('type')
      table.string('name')
      table.unique(['type', 'name'])
    }),
    knex.schema.createTable('taggings', function(table) {
      table.integer('item_id')
      table.integer('tag_id')
      table.primary(['item_id', 'tag_id'])
    })
  ])
}

exports.down = function(knex, Promise) {
  return Promise.all([])
}
