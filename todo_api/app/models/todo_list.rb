class TodoList < ApplicationRecord
  has_many :todo_items, dependent: :destroy # Delete items if list is deleted
  validates :name, presence: true
end
