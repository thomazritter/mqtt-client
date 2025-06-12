import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { TempoDevtools } from "tempo-devtools";
import { BrowserRouter } from "react-router-dom";

// Initialize Tempo Devtools
TempoDevtools.init();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
