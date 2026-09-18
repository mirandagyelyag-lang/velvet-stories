import { useEffect } from "react";
import { finishSpotifyLoginFromUrl } from "../services/spotify";

export default function SpotifyAuthBootstrap() {
  useEffect(() => {
    finishSpotifyLoginFromUrl().catch((error) => {
      console.warn("Spotify authorization callback failed:", error);
    });
  }, []);
  return null;
}
