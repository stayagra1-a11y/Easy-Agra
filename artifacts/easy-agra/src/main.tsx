import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import { getApiBase } from "@/lib/api-base";
import App from "./App";
import "./index.css";

const apiBase = getApiBase();
if (apiBase) {
  setBaseUrl(apiBase);
}

createRoot(document.getElementById("root")!).render(<App />);
