import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { SyncService } from "./services/SyncService";

window.addEventListener('online', () => {
  console.log('App is back online! Syncing queue...');
  SyncService.syncQueueToSupabase();
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
