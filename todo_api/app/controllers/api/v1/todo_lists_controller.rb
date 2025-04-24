module Api
  module V1
    class TodoListsController < ApplicationController
      def index
        @todo_lists = TodoList.all
        render json: @todo_lists
      end

      def show
        # Include associated items for initial load
        @todo_list = TodoList.includes(:todo_items).find(params[:id])
        # Render list details and its items
        render json: @todo_list.as_json(include: :todo_items)
      rescue ActiveRecord::RecordNotFound
        render json: { error: "List not found" }, status: :not_found
      end
    end
  end
end
