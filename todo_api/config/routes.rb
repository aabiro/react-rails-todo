Rails.application.routes.draw do
  # Mount Action Cable server
  mount ActionCable.server => '/cable'

  namespace :api do
    namespace :v1 do
      # RESTful routes for initial data loading and potentially non-realtime actions
      resources :todo_lists, only: [:index, :show] do
        resources :todo_items, only: [:index] # Maybe just load items via the list#show
      end
      # Routes for creating/updating/deleting items via HTTP (can be done via Cable too)
      resources :todo_items, only: [:create, :update, :destroy]
    end
  end

  # Optional: Root route for basic check
  root 'api/v1/todo_lists#index'
end
