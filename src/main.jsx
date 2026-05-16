import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AppErrorBoundary, RuntimeErrorWatcher } from "./components/AppErrorBoundary";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <RuntimeErrorWatcher>
        <App />
      </RuntimeErrorWatcher>
    </AppErrorBoundary>
  </React.StrictMode>
);
