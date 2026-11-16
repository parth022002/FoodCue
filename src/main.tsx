import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import "./styles.css";

// Register Service Worker for offline PWA capabilities
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW registration failed silently; local IndexedDB remains fully operational
    });
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
