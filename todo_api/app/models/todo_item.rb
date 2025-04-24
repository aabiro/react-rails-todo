class TodoItem < ApplicationRecord
  belongs_to :todo_list
  validates :description, presence: true

  # Callback to broadcast changes after commit
  # This broadcasts AFTER the database transaction is complete
  after_commit :broadcast_change

  private

  def broadcast_change
    # Determine action based on transaction state
    # --- FIX: Use transaction_include_any_action? with an array ---
    action = if transaction_include_any_action?([:create])
               'create'
             elsif transaction_include_any_action?([:update])
               'update'
             elsif transaction_include_any_action?([:destroy])
               'destroy'
             else
                nil # Should not happen with after_commit but good practice
             end
    # --- END FIX ---

    return unless action

    # Broadcast the item data and the action type
    # We target the specific list's stream
    ListChannel.broadcast_to(
      self.todo_list,
      { action: action, item: self.as_json } # Send item data as JSON
    )
  end
end