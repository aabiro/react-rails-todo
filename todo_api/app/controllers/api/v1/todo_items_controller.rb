# These are optional if you prefer handling all mutations via Action Cable.
# If you use these, the TodoItem model's after_commit callback will still broadcast.
module Api
  module V1
    class TodoItemsController < ApplicationController
      before_action :set_todo_item, only: [:update, :destroy]

      # POST /api/v1/todo_items (Requires todo_list_id and description)
      def create
        # Ensure todo_list_id is provided if creating via HTTP
        list_id = params[:todo_list_id] || params.dig(:todo_item, :todo_list_id)
        render json: { error: "List ID missing" }, status: :unprocessable_entity and return unless list_id

        @todo_list = TodoList.find(list_id)
        @todo_item = @todo_list.todo_items.new(todo_item_params)
        if @todo_item.save
          # Broadcast handled by model callback
          render json: @todo_item, status: :created
        else
          render json: @todo_item.errors, status: :unprocessable_entity
        end
      rescue ActiveRecord::RecordNotFound
         render json: { error: "List not found" }, status: :not_found
      end

      # PATCH/PUT /api/v1/todo_items/:id (Requires description and/or completed)
      def update
        if @todo_item.update(todo_item_params)
          # Broadcast handled by model callback
          render json: @todo_item
        else
          render json: @todo_item.errors, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/todo_items/:id
      def destroy
        # Broadcast handled by model callback
        @todo_item.destroy
        head :no_content # Return 204 No Content
      end

      private

      def set_todo_item
        @todo_item = TodoItem.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Item not found" }, status: :not_found
      end

      # Allow todo_list_id only if needed for HTTP creation context
      def todo_item_params
        params.require(:todo_item).permit(:description, :completed)
      end
    end
  end
end
