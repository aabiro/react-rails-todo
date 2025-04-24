# db/seeds.rb
list = TodoList.find_or_create_by!(id: 1) do |l|
  l.name = "Default List"
end
puts "Created or found list: #{list.name} (ID: #{list.id})"

# Optional: Add some initial items
list.todo_items.find_or_create_by!(description: "Learn Action Cable")
list.todo_items.find_or_create_by!(description: "Build cool app")
