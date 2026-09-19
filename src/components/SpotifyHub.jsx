import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  LoaderCircle,
  Music2,
  Pause,
  Play,
  Search,
  SkipBack,
  SkipForward,
  Unplug,
  Volume2,
  X,
} from "lucide-react";
import {
  beginSpotifyLogin,
  disconnectSpotify,
  loadSpotifySdk,
  spotifyApi,
  spotifyConfigured,
  spotifyToken,
} from "../services/spotify";

const LAST_TRACK_KEY = "velvet:spotify:last-track:v2";

function imageFor(item) {
  return item?.images?.[0]?.url || item?.album?.images?.[0]?.url || "";
}

function artistFor(track) {
  return track?.artists?.map((artist) => artist.name).filter(Boolean).join(", ") || "Spotify";
}

function readLastTrack() {
  try {
    return JSON.parse(localStorage.getItem(LAST_TRACK_KEY) || "null");
  } catch {
    return null;
  }
}

function saveLastTrack(track, position = 0) {
  if (!track?.uri) return;
  try {
    localStorage.setItem(
      LAST_TRACK_KEY,
      JSON.stringify({
        uri: track.uri,
        name: track.name || "Spotify",
        artist: artistFor(track),
        image: imageFor(track),
        position,
      }),
    );
  } catch {}
}

function spotifyTrackUrl(track) {
  const id = track?.uri?.split(":").pop();
  return track?.external_urls?.spotify || (id ? `https://open.spotify.com/track/${id}` : "");
}

function friendlySpotifyError(error) {
  const message = String(error?.message || error || "Spotify could not complete that action.");
  if (error?.status === 403 || message.includes("(403)")) {
    return "Spotify needs fresh library permission. Reconnect once and try again.";
  }
  if (error?.status === 429 || message.includes("(429)")) {
    return "Spotify is rate-limiting requests for a moment. Try again shortly.";
  }
  return message;
}

export default function SpotifyHub() {
  const playerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [connected, setConnected] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [playerState, setPlayerState] = useState(null);
  const [optimisticTrack, setOptimisticTrack] = useState(() => readLastTrack());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [volume, setVolume] = useState(0.55);
  const [view, setView] = useState("home");
  const [title, setTitle] = useState("Tu Spotify");
  const [playlists, setPlaylists] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [homeLoaded, setHomeLoaded] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const toggle = () => {
      try {
        playerRef.current?.activateElement?.();
      } catch {}
      setOpen((current) => !current);
    };
    const close = () => setOpen(false);
    window.addEventListener("velvet:spotify-toggle", toggle);
    window.addEventListener("velvet:spotify-close", close);
    return () => {
      window.removeEventListener("velvet:spotify-toggle", toggle);
      window.removeEventListener("velvet:spotify-close", close);
    };
  }, []);

  useEffect(() => {
    if (!spotifyConfigured) return undefined;

    let alive = true;
    let player = null;

    (async () => {
      try {
        const token = await spotifyToken();
        if (!alive) return;
        if (!token) {
          setAuthorized(false);
          return;
        }

        setAuthorized(true);
        const Spotify = await loadSpotifySdk();
        if (!alive) return;

        player = new Spotify.Player({
          name: "Velvet Stories",
          volume,
          getOAuthToken: async (callback) => {
            try {
              const freshToken = await spotifyToken();
              if (!freshToken) throw new Error("Spotify session expired. Connect again.");
              callback(freshToken);
            } catch (tokenError) {
              if (alive) setError(friendlySpotifyError(tokenError));
            }
          },
        });

        playerRef.current = player;

        player.addListener("ready", ({ device_id }) => {
          if (!alive) return;
          setDeviceId(device_id);
          setConnected(true);
          setError("");
        });
        player.addListener("not_ready", () => {
          if (!alive) return;
          setConnected(false);
          setError("Velvet's Spotify player went offline.");
        });
        player.addListener("initialization_error", ({ message }) => {
          if (alive) setError(message || "Spotify player initialization failed.");
        });
        player.addListener("authentication_error", ({ message }) => {
          if (alive) setError(message || "Spotify authentication failed.");
        });
        player.addListener("account_error", ({ message }) => {
          if (alive) setError(message || "Spotify Premium is required for playback inside Velvet.");
        });
        player.addListener("playback_error", ({ message }) => {
          if (alive) setError(message || "Spotify playback failed.");
        });
        player.addListener("player_state_changed", (nextState) => {
          if (!alive || !nextState) return;
          setPlayerState(nextState);
          const current = nextState.track_window?.current_track;
          if (current) {
            setOptimisticTrack(current);
            saveLastTrack(current, nextState.position || 0);
          }
        });

        const didConnect = await player.connect();
        if (!didConnect && alive) {
          setError("Spotify loaded, but Velvet could not create a playback device.");
        }
      } catch (bootError) {
        if (alive) setError(friendlySpotifyError(bootError));
      }
    })();

    return () => {
      alive = false;
      try {
        player?.disconnect?.();
      } catch {}
      if (playerRef.current === player) playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!open || !authorized || !connected || homeLoaded) return undefined;
    let cancelled = false;

    (async () => {
      setBusy(true);
      try {
        const data = await spotifyApi("/me/playlists?limit=50");
        if (!cancelled) {
          setPlaylists(data?.items || []);
          setHomeLoaded(true);
        }
      } catch (loadError) {
        if (!cancelled) setError(friendlySpotifyError(loadError));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, authorized, connected, homeLoaded]);

  async function connectSpotify() {
    if (connecting) return;
    setConnecting(true);
    setError("");
    try {
      await beginSpotifyLogin();
    } catch (connectError) {
      setError(friendlySpotifyError(connectError));
      setConnecting(false);
    }
  }

  async function reconnectSpotify() {
    try {
      playerRef.current?.disconnect?.();
    } catch {}
    disconnectSpotify();
    setAuthorized(false);
    setConnected(false);
    setDeviceId("");
    setHomeLoaded(false);
    setPlaylists([]);
    setTracks([]);
    await connectSpotify();
  }

  function disconnect() {
    try {
      playerRef.current?.disconnect?.();
    } catch {}
    disconnectSpotify();
    playerRef.current = null;
    setAuthorized(false);
    setConnected(false);
    setDeviceId("");
    setPlayerState(null);
    setTracks([]);
    setPlaylists([]);
    setHomeLoaded(false);
    setView("home");
    setTitle("Tu Spotify");
    setError("");
  }

  async function openPlaylist(playlist) {
    if (!playlist?.id) return;
    setBusy(true);
    setError("");
    try {
      const data = await spotifyApi(`/playlists/${encodeURIComponent(playlist.id)}/items?limit=50`);
      const nextTracks = (data?.items || [])
        .map((entry) => entry?.item || entry?.track)
        .filter((track) => track?.uri?.startsWith("spotify:track:"));
      setTracks(nextTracks);
      setTitle(playlist.name || "Playlist");
      setView("tracks");
    } catch (playlistError) {
      setError(friendlySpotifyError(playlistError));
    } finally {
      setBusy(false);
    }
  }

  async function openLikedSongs() {
    setBusy(true);
    setError("");
    try {
      const data = await spotifyApi("/me/tracks?limit=50");
      const nextTracks = (data?.items || [])
        .map((entry) => entry?.track || entry?.item)
        .filter((track) => track?.uri?.startsWith("spotify:track:"));
      setTracks(nextTracks);
      setTitle("Tus Me gusta");
      setView("tracks");
    } catch (likedError) {
      setError(friendlySpotifyError(likedError));
    } finally {
      setBusy(false);
    }
  }

  async function searchSpotify(event) {
    event?.preventDefault();
    const clean = query.trim();
    if (!clean) return;
    setBusy(true);
    setError("");
    try {
      const data = await spotifyApi(`/search?q=${encodeURIComponent(clean)}&type=track&limit=10`);
      setTracks((data?.tracks?.items || []).filter((track) => track?.uri));
      setTitle(`Buscar · ${clean}`);
      setView("tracks");
    } catch (searchError) {
      setError(friendlySpotifyError(searchError));
    } finally {
      setBusy(false);
    }
  }

  async function playAt(index) {
    const selected = tracks[index];
    if (!selected?.uri || !deviceId) {
      setError("Spotify is still preparing Velvet's playback device.");
      return;
    }

    setError("");
    setOptimisticTrack(selected);
    saveLastTrack(selected, 0);

    try {
      await playerRef.current?.activateElement?.();
      const uris = tracks.map((track) => track?.uri).filter(Boolean);
      const chosen = uris.indexOf(selected.uri);
      const orderedUris = chosen >= 0
        ? [...uris.slice(chosen), ...uris.slice(0, chosen)]
        : [selected.uri];

      await spotifyApi(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
        method: "PUT",
        body: JSON.stringify({ uris: orderedUris.slice(0, 100) }),
      });

      window.setTimeout(async () => {
        try {
          const nextState = await playerRef.current?.getCurrentState?.();
          if (nextState) setPlayerState(nextState);
        } catch {}
      }, 450);
    } catch (playError) {
      setError(friendlySpotifyError(playError));
    }
  }

  async function togglePlayback() {
    try {
      await playerRef.current?.activateElement?.();
      await playerRef.current?.togglePlay?.();
    } catch (playError) {
      setError(friendlySpotifyError(playError));
    }
  }

  async function previousTrack() {
    try {
      await playerRef.current?.previousTrack?.();
    } catch (playError) {
      setError(friendlySpotifyError(playError));
    }
  }

  async function nextTrack() {
    try {
      await playerRef.current?.nextTrack?.();
    } catch (playError) {
      setError(friendlySpotifyError(playError));
    }
  }

  async function changeVolume(event) {
    const nextVolume = Number(event.target.value);
    setVolume(nextVolume);
    try {
      await playerRef.current?.setVolume?.(nextVolume);
    } catch (volumeError) {
      setError(friendlySpotifyError(volumeError));
    }
  }

  function goHome() {
    setView("home");
    setTitle("Tu Spotify");
    setTracks([]);
    setError("");
  }

  if (!open) return null;

  const currentTrack = playerState?.track_window?.current_track || optimisticTrack;
  const paused = playerState?.paused !== false;
  const currentImage = imageFor(currentTrack);
  const currentUrl = spotifyTrackUrl(currentTrack);

  return (
    <div className="velvet-spotify-hub">
      <button
        type="button"
        className="velvet-spotify-hub__shade"
        onClick={() => setOpen(false)}
        aria-label="Cerrar Spotify"
      />
      <section className="velvet-spotify-panel" role="dialog" aria-modal="true" aria-label="Spotify dentro de Velvet">
        <header className="velvet-spotify-panel__header">
          <button
            type="button"
            className="velvet-spotify-panel__icon"
            onClick={view === "home" ? () => setOpen(false) : goHome}
            aria-label={view === "home" ? "Cerrar Spotify" : "Volver a Spotify"}
          >
            {view === "home" ? <X size={20} /> : <ArrowLeft size={20} />}
          </button>
          <div>
            <strong>Spotify</strong>
            <small>{authorized ? "Dentro de Velvet Stories" : "Conecta tu cuenta"}</small>
          </div>
          {authorized && (
            <button type="button" className="velvet-spotify-panel__disconnect" onClick={disconnect}>
              <Unplug size={15} />
              Salir
            </button>
          )}
        </header>

        {!spotifyConfigured ? (
          <div className="velvet-spotify-panel__empty">
            <Music2 size={28} />
            <strong>Falta configurar Spotify</strong>
            <span>Velvet no encontró VITE_SPOTIFY_CLIENT_ID en este build.</span>
          </div>
        ) : !authorized ? (
          <div className="velvet-spotify-panel__empty">
            <Music2 size={30} />
            <strong>Tu música, sin salir de Velvet</strong>
            <span>Conecta Spotify Premium para buscar canciones, abrir tus playlists y escuchar mientras chateas.</span>
            <button type="button" disabled={connecting} onClick={connectSpotify}>
              {connecting ? "Abriendo Spotify…" : "Conectar Spotify"}
            </button>
          </div>
        ) : !connected ? (
          <div className="velvet-spotify-panel__empty">
            <LoaderCircle className="spin" size={28} />
            <strong>Preparando el reproductor</strong>
            <span>{error || "Spotify está creando el dispositivo Velvet Stories."}</span>
            {error && <button type="button" onClick={reconnectSpotify}>Reconectar Spotify</button>}
          </div>
        ) : (
          <>
            <form className="velvet-spotify-search" onSubmit={searchSpotify}>
              <Search size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Busca cualquier canción en Spotify"
                aria-label="Buscar canciones en Spotify"
              />
              <button type="submit" disabled={busy || !query.trim()}>Buscar</button>
            </form>

            <main className="velvet-spotify-panel__content">
              {view === "home" ? (
                <>
                  <button type="button" className="velvet-spotify-liked" onClick={openLikedSongs}>
                    <span className="velvet-spotify-liked__art">♥</span>
                    <span><strong>Tus Me gusta</strong><small>Tu biblioteca guardada</small></span>
                    <Play size={16} />
                  </button>

                  <div className="velvet-spotify-section-title">
                    <span>Tus playlists</span>
                    {busy && <LoaderCircle className="spin" size={15} />}
                  </div>

                  <div className="velvet-spotify-list">
                    {!busy && playlists.length === 0 && (
                      <p className="velvet-spotify-list__empty">No encontré playlists todavía.</p>
                    )}
                    {playlists.map((playlist) => {
                      const artwork = imageFor(playlist);
                      return (
                        <button
                          type="button"
                          className="velvet-spotify-row"
                          key={playlist.id}
                          onClick={() => openPlaylist(playlist)}
                        >
                          {artwork ? <img src={artwork} alt="" /> : <span className="velvet-spotify-row__art"><Music2 size={18} /></span>}
                          <span className="velvet-spotify-row__meta">
                            <strong>{playlist.name}</strong>
                            <small>{playlist.items?.total ?? playlist.tracks?.total ?? ""} canciones</small>
                          </span>
                          <Play size={16} />
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="velvet-spotify-section-title">
                    <span>{title}</span>
                    {busy && <LoaderCircle className="spin" size={15} />}
                  </div>
                  <div className="velvet-spotify-list">
                    {!busy && tracks.length === 0 && (
                      <p className="velvet-spotify-list__empty">No encontré canciones aquí.</p>
                    )}
                    {tracks.map((track, index) => {
                      const artwork = imageFor(track);
                      const active = currentTrack?.uri && currentTrack.uri === track.uri;
                      return (
                        <button
                          type="button"
                          className={`velvet-spotify-row velvet-spotify-row--track${active ? " is-active" : ""}`}
                          key={`${track.id || track.uri}-${index}`}
                          onClick={() => playAt(index)}
                        >
                          {artwork ? <img src={artwork} alt="" /> : <span className="velvet-spotify-row__art"><Music2 size={18} /></span>}
                          <span className="velvet-spotify-row__meta">
                            <strong>{track.name}</strong>
                            <small>{artistFor(track)}</small>
                          </span>
                          {active && playerState && !paused ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </main>

            <footer className="velvet-spotify-now">
              {currentTrack?.uri ? (
                <>
                  <div className="velvet-spotify-now__track">
                    {currentImage ? <img src={currentImage} alt="" /> : <span><Music2 size={17} /></span>}
                    <div>
                      <strong>{currentTrack.name || "Spotify"}</strong>
                      <small>{artistFor(currentTrack)}</small>
                    </div>
                    {currentUrl && (
                      <a href={currentUrl} target="_blank" rel="noreferrer" aria-label="Abrir canción en Spotify">
                        <ExternalLink size={15} />
                      </a>
                    )}
                  </div>
                  <div className="velvet-spotify-now__controls">
                    <button type="button" onClick={previousTrack} aria-label="Anterior"><SkipBack size={20} /></button>
                    <button type="button" className="velvet-spotify-now__play" onClick={togglePlayback} aria-label={paused ? "Reproducir" : "Pausar"}>
                      {paused ? <Play size={21} /> : <Pause size={21} />}
                    </button>
                    <button type="button" onClick={nextTrack} aria-label="Siguiente"><SkipForward size={20} /></button>
                  </div>
                </>
              ) : (
                <div className="velvet-spotify-now__waiting">
                  <Music2 size={16} />
                  <span>Elige una canción y seguirá sonando aunque cierres esta ventana.</span>
                </div>
              )}
              <label className="velvet-spotify-now__volume">
                <Volume2 size={15} />
                <input type="range" min="0" max="1" step="0.02" value={volume} onChange={changeVolume} aria-label="Volumen de Spotify" />
              </label>
              {error && (
                <div className="velvet-spotify-now__error">
                  <span>{error}</span>
                  {(error.includes("permission") || error.includes("403") || error.includes("expired")) && (
                    <button type="button" onClick={reconnectSpotify}>Reconectar</button>
                  )}
                </div>
              )}
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
