class ListChannel < ApplicationCable::Channel
  # Called when a client connects and subscribes to this channel
  # with specific parameters (e.g., list_id)
  def subscribed
    # Find the specific TodoList based on params sent from the client
    @todo_list = TodoList.find_by(id: params[:list_id])

    if @todo_list
      # Create a unique stream name for this specific list
      # Clients subscribing to the same list_id will join the same stream
      stream_for @todo_list
      puts "Client subscribed to list ##{@todo_list.id}" # Server log
    else
      # Handle case where list_id is invalid
      reject # Rejects the subscription request
      puts "Subscription rejected: Invalid list_id #{params[:list_id]}"
    end
  end

  # Called when a client unsubscribes or disconnects
  def unsubscribed
    # Any cleanup needed when a client leaves the channel
    puts "Client unsubscribed from list ##{@todo_list&.id}" # Use safe navigation operator
  end

  # --- Custom Actions Clients Can Call ---

  # Example: Client calls `subscription.perform('add_item', { description: 'New task' })`
  def add_item(data)
    return unless @todo_list # Ensure we have a list context

    description = data['description']&.strip # Get description, remove whitespace

    if description.present?
      # Create the new item associated with the current list
      # The `after_commit` callback on TodoItem will handle broadcasting
      @todo_list.todo_items.create(description: description)
      puts "Item added to list ##{@todo_list.id}: #{description}" # Server log
    else
      # Optionally send an error back to the specific client if needed
      puts "Failed to add item: description blank"
    end
  end

  # Example: Client calls `subscription.perform('toggle_item', { id: 5 })`
  def toggle_item(data)
    return unless @todo_list
    item_id = data['id']
    item = @todo_list.todo_items.find_by(id: item_id)

    if item
      # Toggle the completed status and save
      # The `after_commit` callback on TodoItem will handle broadcasting
      item.update(completed: !item.completed)
      puts "Item toggled on list ##{@todo_list.id}: ID #{item.id}" # Server log
    else
      puts "Failed to toggle item: ID #{item_id} not found on list ##{@todo_list.id}"
    end
  end

  # Example: Client calls `subscription.perform('delete_item', { id: 5 })`
  def delete_item(data)
     return unless @todo_list
    item_id = data['id']
    item = @todo_list.todo_items.find_by(id: item_id)

    if item
      # Destroy the item
      # The `after_commit` callback on TodoItem will handle broadcasting
      item.destroy
      puts "Item deleted from list ##{@todo_list.id}: ID #{item.id}" # Server log
    else
       puts "Failed to delete item: ID #{item_id} not found on list ##{@todo_list.id}"
    end
  end
end