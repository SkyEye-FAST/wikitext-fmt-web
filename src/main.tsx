import "@fontsource/libertinus-serif/latin-400.css";
import "@fontsource/libertinus-serif/latin-600.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import "./styles/tokens.css";
import "./styles/app.css";

import { StrictMode } from "react";

import { createRoot } from "react-dom/client";

import App from "./app/App.js";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Application root was not found.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
