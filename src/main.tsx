import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

// Keep screen awake for kiosk/dashboard use
async function keepAwake() {
  // Method 1: Wake Lock API (modern browsers)
  try {
    if ("wakeLock" in navigator) {
      await navigator.wakeLock.request("screen");
      return; // success — no need for fallback
    }
  } catch {
    // not supported or denied
  }

  // Method 2: Hidden video trick (Android/Kindle fallback)
  // A looping video with audio track prevents the OS from dimming
  try {
    const video = document.createElement("video");
    video.setAttribute("playsinline", "");
    video.setAttribute("muted", "");
    video.setAttribute("loop", "");
    video.muted = true;
    video.style.position = "fixed";
    video.style.width = "1px";
    video.style.height = "1px";
    video.style.opacity = "0";
    video.style.pointerEvents = "none";
    // Tiny transparent webm with audio track
    video.src = "data:video/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZwH/////////FUmpZpkq17GDD0JATYCGQ2hyb21lV0WGQ2hyb21lFlSua7+uvdeBAXPFh1BERmdBe0JPQ09kc0GKhaEBTZ2BACKyS0EBlMBB5EAAAAAAFN+ebAAAAAAAA16P///////////////lA5ov///////////////uwAAAAAAABkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    document.body.appendChild(video);
    video.play();
  } catch {
    // last resort: no-op
  }
}

keepAwake();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") keepAwake();
});

// Also simulate activity every 20s to reset idle timers
setInterval(() => {
  window.dispatchEvent(new MouseEvent("mousemove", { clientX: 0, clientY: 0 }));
}, 20000);

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
