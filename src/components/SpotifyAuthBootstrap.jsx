import { useEffect, useState } from "react";
import { finishSpotifyLoginFromUrl } from "../services/spotify";

const RETURN_KEY = "velvet:spotify:return:v2";

export default function SpotifyAuthBootstrap() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const url = new URL(window.location.href);
    const hasCallback = url.searchParams.has("code") || url.searchParams.has("error");
    if (!hasCallback) return;

    let alive = true;
    setMessage("Finishing Spotify connection…");

    (async () => {
      try {
        const finished = await finishSpotifyLoginFromUrl();
        if (!alive || !finished) return;

        localStorage.setItem("velvet:spotify:connected:v1", String(Date.now()));
        window.dispatchEvent(new CustomEvent("velvet:spotify-connected"));

        const returnUrl = sessionStorage.getItem(RETURN_KEY);
        sessionStorage.removeItem(RETURN_KEY);

        setMessage("Spotify connected ✓");
        window.setTimeout(() => {
          if (returnUrl && returnUrl.startsWith(window.location.origin)) {
            window.location.replace(returnUrl);
          } else {
            window.location.replace(`${window.location.origin}/?open=chats`);
          }
        }, 350);
      } catch (error) {
        console.error("Spotify callback failed:", error);
        setMessage(error?.message || "Spotify could not finish connecting.");
      }
    })();

    return () => { alive = false; };
  }, []);

  if (!message) return null;
  return (
    <div className="velvet-spotify-callback-status" role="status" aria-live="polite">
      {message}
    </div>
  );
}
