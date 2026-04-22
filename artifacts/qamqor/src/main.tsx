import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';
import App from "./app/index";
import "./index.css";

registerSW({
  onNeedRefresh() {
    // Optionally prompt user to reload, but we used autoUpdate
  },
  onOfflineReady() {
    console.log("App is ready for offline use");
  },
});

createRoot(document.getElementById("root")!).render(<App />);
