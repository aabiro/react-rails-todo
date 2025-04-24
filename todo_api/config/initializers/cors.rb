Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # --- EDIT: Ensure localhost:3000 and deployed URL are present ---
    # Adjust origins for your React app's dev and production URLs
    # Replace 'YOUR_DEPLOYED_REACT_APP_URL' with the actual URL when you deploy
    origins 'http://localhost:3000', 'YOUR_DEPLOYED_REACT_APP_URL'

    resource '*', # Allow requests to any resource path
      headers: :any, # Allow any headers
      # Ensure standard methods are allowed for REST API and Action Cable handshake
      methods: [:get, :post, :put, :patch, :delete, :options, :head]
  end
end