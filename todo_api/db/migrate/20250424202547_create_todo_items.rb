class CreateTodoItems < ActiveRecord::Migration[8.0]
  def change
    create_table :todo_items do |t|
      t.string :description
      t.boolean :completed, default: false, null: false
      t.references :todo_list, null: false, foreign_key: true

      t.timestamps
    end
  end
end
