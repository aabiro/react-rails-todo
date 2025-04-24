import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  createContext,
  useContext,
} from "react";
import ActionCable from "actioncable"; // Use the official JS library

// --- Configuration ---
// Use environment variables for URLs

// --- FIX: Use wss:// for secure WebSocket connection ---
// Construct WebSocket URL based on the API base URL's protocol
const determineWsUrl = (apiUrl) => {
  if (!apiUrl) return "ws://localhost:3000/cable"; // Default for local if API URL not set

  const url = new URL(apiUrl); // Use URL constructor for easier parsing
  const protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${url.host}/cable`; // Construct WSS or WS URL with the host
};

// Determine API base URL first
const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:3000/api/v1"; // HTTP API URL

// Determine WebSocket URL based on API_BASE_URL
const WS_URL =
  process.env.REACT_APP_WS_URL ||
  determineWsUrl(API_BASE_URL.replace("/api/v1", "")); // Pass base URL without path
// --- End Fix ---

// --- Action Cable Context ---
// Provides the Action Cable consumer instance to the app
const ActionCableContext = createContext();

const ActionCableProvider = ({ children }) => {
  const [consumer, setConsumer] = useState(null);

  useEffect(() => {
    // console.log('Connecting Action Cable to:', WS_URL); // Debug log
    const cable = ActionCable.createConsumer(WS_URL);
    setConsumer(cable);

    // Disconnect on unmount
    return () => {
      // console.log('Disconnecting Action Cable'); // Debug log
      cable.disconnect();
    };
  }, []); // Empty dependency array ensures this runs only once

  return (
    <ActionCableContext.Provider value={consumer}>
      {children}
    </ActionCableContext.Provider>
  );
};

// Hook to easily access the consumer
const useActionCable = () => {
  return useContext(ActionCableContext);
};

// --- Main App Component ---
function App() {
  // For simplicity, we'll hardcode using TodoList with ID 1
  // In a real app, you might fetch a list of lists or use routing
  const listId = 1;

  return (
    <ActionCableProvider>
      {/* Enhanced background and padding */}
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-white p-4 sm:p-10 font-sans">
        {/* Centered container with better shadow and rounded corners */}
        <div className="max-w-xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Header section with gradient */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
            <h1 className="text-3xl font-bold text-center text-white mb-1">
              Real-Time To-Do
            </h1>
            {/* Subtitle or List ID display */}
            <p className="text-center text-indigo-100 text-sm">
              List ID: {listId}
            </p>
          </div>
          {/* Content area with padding */}
          <div className="p-6">
            {/* Render the TodoList component, passing the list ID */}
            <TodoList listId={listId} />
          </div>
        </div>
        <footer className="text-center mt-10 text-gray-500 text-xs">
          Powered by React, Rails, and Action Cable
        </footer>
      </div>
    </ActionCableProvider>
  );
}

// --- TodoList Component ---
function TodoList({ listId }) {
  const [items, setItems] = useState([]); // State for todo items
  const [listName, setListName] = useState(""); // State for the list name
  const [isLoading, setIsLoading] = useState(true); // Loading state for initial fetch
  const [error, setError] = useState(null); // Error state
  const cable = useActionCable(); // Get the Action Cable consumer
  const channelRef = useRef(null); // Ref to store the subscription

  // --- Fetch initial list data ---
  const fetchListData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Construct the full URL for the specific list
      const listApiUrl = `${API_BASE_URL}/todo_lists/${listId}`;
      // console.log("Fetching from:", listApiUrl); // Debug log
      const response = await fetch(listApiUrl);
      if (!response.ok) {
        // Try to read the response body for more error details
        let errorText = `HTTP error! Status: ${response.status}`;
        try {
          const body = await response.text();
          console.error("API Error Response Body:", body);
          // If it's HTML, don't include it directly in the user-facing error
          if (!body.trim().startsWith("<!DOCTYPE")) {
            errorText += ` - ${body}`;
          }
        } catch (e) {
          /* Ignore if body cannot be read */
        }
        throw new Error(errorText);
      }
      const data = await response.json();
      setListName(data.name || `List ${listId}`); // Set list name
      setItems(data.todo_items || []); // Set initial items
    } catch (e) {
      console.error("Failed to fetch initial list data:", e);
      setError(`Failed to load list data: ${e.message}`);
      setItems([]); // Clear items on error
    } finally {
      setIsLoading(false);
    }
  }, [listId]); // Dependency list only includes listId

  // --- Action Cable Subscription Effect ---
  useEffect(() => {
    // Fetch initial data when component mounts or listId changes
    fetchListData();

    if (cable) {
      // console.log(`Subscribing to ListChannel for list_id: ${listId}`); // Debug log
      // Create subscription
      const channel = cable.subscriptions.create(
        { channel: "ListChannel", list_id: listId }, // Channel name and params
        {
          // Called when the subscription is ready for use
          connected: () => {
            console.log(`Connected to ListChannel (List ID: ${listId})`);
          },
          // Called when the subscription is rejected by the server
          rejected: () => {
            console.error(`Subscription rejected for List ID: ${listId}`);
            setError(
              `Failed to subscribe to list updates. Is list ID ${listId} valid?`
            );
          },
          // Called when the subscription has been terminated by the server
          disconnected: () => {
            console.log(`Disconnected from ListChannel (List ID: ${listId})`);
          },
          // --- Called when data is broadcast from the server ---
          received: (data) => {
            // console.log('Received data:', data); // Debug log
            const { action, item } = data;

            setItems((currentItems) => {
              // Sort function to keep completed items at the bottom
              const sortItems = (a, b) => {
                if (a.completed === b.completed) {
                  // If completion status is the same, sort by creation time (newest first) or ID
                  // Assuming created_at exists and is comparable
                  return (b.created_at || b.id) > (a.created_at || a.id)
                    ? 1
                    : -1;
                }
                return a.completed ? 1 : -1; // Completed items go last
              };

              let newItems;
              switch (action) {
                case "create":
                  // Add the new item if it's not already present (by id)
                  newItems = currentItems.some((i) => i.id === item.id)
                    ? currentItems
                    : [...currentItems, item];
                  break; // Added break statement
                case "update":
                  // Update the existing item
                  newItems = currentItems.map((i) =>
                    i.id === item.id ? item : i
                  );
                  break; // Added break statement
                case "destroy":
                  // Remove the deleted item
                  newItems = currentItems.filter((i) => i.id !== item.id);
                  break; // Added break statement
                default:
                  // Ignore unknown actions
                  console.warn("Received unknown action:", action);
                  newItems = currentItems; // Keep current items
              }
              // Sort the potentially updated list
              return newItems.sort(sortItems);
            });
          },
        }
      );
      // Store the subscription in the ref
      channelRef.current = channel;
    } else {
      console.log("Action Cable consumer not ready yet."); // Debug log
    }

    // --- Cleanup function ---
    // Called when the component unmounts or listId changes
    return () => {
      if (channelRef.current) {
        // console.log(`Unsubscribing from List ID: ${listId}`); // Debug log
        channelRef.current.unsubscribe(); // Unsubscribe from the channel
        channelRef.current = null;
      }
    };
  }, [cable, listId, fetchListData]); // Dependencies: re-run if cable, listId, or fetch function changes

  // --- Handler Functions to Call Channel Actions ---
  const handleAddItem = (description) => {
    if (channelRef.current && description.trim()) {
      // console.log('Performing add_item:', description); // Debug log
      channelRef.current.perform("add_item", {
        description: description.trim(),
      });
    }
  };

  const handleToggleItem = (itemId) => {
    if (channelRef.current) {
      // console.log('Performing toggle_item:', itemId); // Debug log
      channelRef.current.perform("toggle_item", { id: itemId });
    }
  };

  const handleDeleteItem = (itemId) => {
    if (channelRef.current) {
      // console.log('Performing delete_item:', itemId); // Debug log
      channelRef.current.perform("delete_item", { id: itemId });
    }
  };

  // --- Render Logic ---
  if (isLoading) {
    return <div className="text-center p-6 text-gray-500">Loading list...</div>;
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-700 bg-red-100 border border-red-400 rounded-lg">
        Error: {error}
      </div>
    );
  }

  return (
    <div>
      {/* List name could be displayed here if needed */}
      {/* <h2 className="text-xl font-semibold mb-4">{listName}</h2> */}
      <AddTodoForm onAddItem={handleAddItem} />
      <div className="mt-6 border-t border-gray-200 pt-4">
        {items.length === 0 ? (
          <p className="text-center text-gray-500 italic py-4">
            Your list is empty. Add an item above!
          </p>
        ) : (
          <ul className="space-y-3">
            {" "}
            {/* Increased spacing */}
            {items.map((item) => (
              <TodoItem
                key={item.id}
                item={item}
                onToggle={handleToggleItem}
                onDelete={handleDeleteItem}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// --- AddTodoForm Component ---
function AddTodoForm({ onAddItem }) {
  const [description, setDescription] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (description.trim()) {
      onAddItem(description);
      setDescription(""); // Clear input after adding
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 items-center">
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What needs to be done?"
        // Enhanced input styling
        className="flex-grow px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-150 ease-in-out"
      />
      <button
        type="submit"
        // Enhanced button styling
        className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg shadow-md hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition duration-150 ease-in-out transform hover:scale-105"
        disabled={!description.trim()}
      >
        Add
      </button>
    </form>
  );
}

// --- TodoItem Component ---
function TodoItem({ item, onToggle, onDelete }) {
  return (
    // Enhanced list item styling with hover effect and transition
    <li
      className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ease-in-out group ${
        item.completed
          ? "bg-gray-100 border-gray-200"
          : "bg-white border-gray-200 hover:shadow-md hover:border-indigo-200"
      }`}
    >
      <div className="flex items-center gap-3 flex-grow min-w-0">
        {" "}
        {/* Added min-w-0 for better text wrapping */}
        <input
          type="checkbox"
          checked={item.completed}
          onChange={() => onToggle(item.id)}
          // Nicer checkbox styling
          className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer flex-shrink-0"
        />
        {/* Apply line-through and text color based on completion status */}
        <span
          className={`flex-1 break-words ${
            item.completed ? "line-through text-gray-400" : "text-gray-800"
          }`}
        >
          {item.description}
        </span>
      </div>
      {/* Delete button appears on hover (using group-hover) */}
      <button
        onClick={() => onDelete(item.id)}
        className="ml-3 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-in-out focus:opacity-100 focus:outline-none"
        aria-label={`Delete item ${item.description}`}
      >
        {/* Simple trash icon using SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </li>
  );
}

export default App;

// --- To Run ---
// 1. Make sure Rails backend is running (e.g., rails s -p 3000)
// 2. Set up React project (npx create-react-app todo-frontend)
// 3. Install Action Cable JS client: `npm install actioncable` or `yarn add actioncable`
// 4. Install Tailwind CSS (follow official guide, install @tailwindcss/postcss if needed)
// 5. Replace src/App.js with this code.
// 6. Set environment variables if needed (e.g., in .env file):
//    REACT_APP_WS_URL=wss://your-rails-api.onrender.com/cable
//    REACT_APP_API_URL=https://your-rails-api.onrender.com/api/v1
// 7. Start React app: `npm start` or `yarn start`
