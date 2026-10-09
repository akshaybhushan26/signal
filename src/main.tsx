import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { Analytics } from "@vercel/analytics/react";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "./styles.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <Analytics mode={import.meta.env.DEV ? "development" : "production"} />
  </React.StrictMode>,
);
