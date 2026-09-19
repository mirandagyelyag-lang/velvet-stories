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

function primaryArtist(track) {
  const artist = track?.artists?.[0];
  if (!artist?.name) return null;
  return { id: artist.id || "", name: artist.name };
}

function trackHasArtist(track, anchor) {
  if (!anchor) return false;
  return (track?.artists || []).some((artist) => {
    if (anchor.id && artist?.id) return artist.id === anchor.id;
    return String(artist?.name || "").toLowerCase() === String(anchor.name || "").toLowerCase();
  });
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
    return "Spotify blocked this action (403). Velvet will not ask you to reconnect for this again.";
  }
  if (error?.status === 429 || message.includes("(429)")) {
    return "Spotify is rate-limiting requests for a moment. Try again shortly.";
  }
  return message;
}

export default function SpotifyHub() {
  const playerRef = useRef(null);
  const deviceIdRef = useRef("");
  const artistChainRef = useRef(null);
  const artistAutoplayTimerRef = useRef(null);
  const artistAutoplayBusyRef = useRef(false);
  const artistAutoplaySeqRef = useRef(0);
  const artistAutoplayHistoryRef = useRef([]);
  const captureArtistOnNextRef = useRef(false);
  const manualTrackUriRef = useRef("");
  const lastTrackUriRef = useRef("");
  const liveSearchSeqRef = useRef(0);
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
  const [searchBusy, setSearchBusy] = useState(false);

  function clearArtistAutoplayTimer() {
    if (artistAutoplayTimerRef.current) {
      window.clearTimeout(artistAutoplayTimerRef.current);
      artistAutoplayTimerRef.current = null;
    }
  }

  function rememberArtistTrack(uri) {
    if (!uri) return;
    const next = [uri, ...artistAutoplayHistoryRef.current.filter((item) => item !== uri)].slice(0, 8);
    artistAutoplayHistoryRef.current = next;
  }

  async function findNextArtistTrack(anchor, currentUri) {
    if (!anchor?.name) return null;
    const cleanArtist = anchor.name.replace(/"/g, "").trim();
    if (!cleanArtist) return null;

    const data = await spotifyApi(
      `/search?q=${encodeURIComponent(`artist:"${cleanArtist}"`)}&type=track&limit=10`,
    );
    const candidates = (data?.tracks?.items || [])
      .filter((track) => track?.uri?.startsWith("spotify:track:"))
      .filter((track) => track.uri !== currentUri)
      .filter((track) => trackHasArtist(track, anchor));

    if (!candidates.length) return null;

    const fresh = candidates.filter((track) => !artistAutoplayHistoryRef.current.includes(track.uri));
    const pool = fresh.length ? fresh : candidates;
    const index = artistAutoplaySeqRef.current % pool.length;
    artistAutoplaySeqRef.current += 1;
    return pool[index];
  }

  async function playNextFromSameArtist(anchor, currentTrack) {
    if (artistAutoplayBusyRef.current || !anchor || !deviceIdRef.current) return;
    artistAutoplayBusyRef.current = true;
    clearArtistAutoplayTimer();

    try {
      const nextTrack = await findNextArtistTrack(anchor, currentTrack?.uri);
      if (!nextTrack?.uri) return;

      artistChainRef.current = anchor;
      rememberArtistTrack(currentTrack?.uri);
      rememberArtistTrack(nextTrack.uri);
      setOptimisticTrack(nextTrack);
      saveLastTrack(nextTrack, 0);

      await spotifyApi(`/me/player/play?device_id=${encodeURIComponent(deviceIdRef.current)}`, {
        method: "PUT",
        body: JSON.stringify({ uris: [nextTrack.uri] }),
      });
    } catch (autoplayError) {
      setError(friendlySpotifyError(autoplayError));
    } finally {
      artistAutoplayBusyRef.current = false;
    }
  }

  function scheduleArtistAutoplay(nextState, currentTrack) {
    clearArtistAutoplayTimer();
    if (!currentTrack?.uri || nextState?.paused || !nextState?.duration) return;

    const anchor = artistChainRef.current || primaryArtist(currentTrack);
    if (!anchor) return;
    if (!artistChainRef.current) artistChainRef.current = anchor;

    const remaining = Math.max(0, Number(nextState.duration || 0) - Number(nextState.position || 0));
    if (!remaining) return;

    artistAutoplayTimerRef.current = window.setTimeout(() => {
      playNextFromSameArtist(anchor, currentTrack);
    }, remaining + 180);
  }

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
          deviceIdRef.current = device_id;
          setDeviceId(device_id);
          setConnected(true);
          setError("");
        });
        player.addListener("not_ready", () => {
          if (!alive) return;
          deviceIdRef.current = "";
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
          if (!current) {
            clearArtistAutoplayTimer();
            return;
          }

          setOptimisticTrack(current);
          saveLastTrack(current, nextState.position || 0);

          const changedTrack = lastTrackUriRef.current !== current.uri;
          if (changedTrack) {
            const currentArtist = primaryArtist(current);

            if (manualTrackUriRef.current === current.uri) {
              artistChainRef.current = currentArtist;
              manualTrackUriRef.current = "";
              captureArtistOnNextRef.current = false;
            } else if (captureArtistOnNextRef.current || !artistChainRef.current) {
              artistChainRef.current = currentArtist;
              captureArtistOnNextRef.current = false;
            } else if (!trackHasArtist(current, artistChainRef.current)) {
              const desiredArtist = artistChainRef.current;
              lastTrackUriRef.current = current.uri;
              playNextFromSameArtist(desiredArtist, current);
              return;
            }

            lastTrackUriRef.current = current.uri;
            rememberArtistTrack(current.uri);
          }

          scheduleArtistAutoplay(nextState, current);
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
      clearArtistAutoplayTimer();
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

  useEffect(() => {
    if (!open || !authorized || !connected) return undefined;

    const clean = query.trim();
    const requestId = ++liveSearchSeqRef.current;

    if (!clean) {
      setSearchBusy(false);
      setTracks([]);
      setTitle("Tu Spotify");
      setView("home");
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      setSearchBusy(true);
      setError("");

      try {
        const data = await spotifyApi(
          `/search?q=${encodeURIComponent(clean)}&type=track&limit=10`,
        );
        if (liveSearchSeqRef.current !== requestId) return;

        setTracks((data?.tracks?.items || []).filter((track) => track?.uri));
        setTitle(`Buscar · ${clean}`);
        setView("search");
      } catch (searchError) {
        if (liveSearchSeqRef.current === requestId) {
          setError(friendlySpotifyError(searchError));
        }
      } finally {
        if (liveSearchSeqRef.current === requestId) {
          setSearchBusy(false);
        }
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query, open, authorized, connected]);

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
    deviceIdRef.current = "";
    artistChainRef.current = null;
    captureArtistOnNextRef.current = false;
    manualTrackUriRef.current = "";
    lastTrackUriRef.current = "";
    clearArtistAutoplayTimer();
    setDeviceId("");
    setPlayerState(null);
    setTracks([]);
    setPlaylists([]);
    setHomeLoaded(false);
    setView("home");
    setTitle("Tu Spotify");
    setError("");
  }

  async function playPlaylistContext(playlist) {
    const contextUri = playlist?.uri || (playlist?.id ? `spotify:playlist:${playlist.id}` : "");
    artistChainRef.current = null;
    captureArtistOnNextRef.current = true;
    manualTrackUriRef.current = "";
    clearArtistAutoplayTimer();
    if (!contextUri || !deviceId) {
      setError("Spotify is still preparing Velvet's playback device.");
      return false;
    }

    try {
      await playerRef.current?.activateElement?.();
      await spotifyApi(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
        method: "PUT",
        body: JSON.stringify({ context_uri: contextUri }),
      });
      setError("");
      window.setTimeout(async () => {
        try {
          const nextState = await playerRef.current?.getCurrentState?.();
          if (nextState) setPlayerState(nextState);
        } catch {}
      }, 450);
      return true;
    } catch (playError) {
      setError(friendlySpotifyError(playError));
      return false;
    }
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

      if (!nextTracks.length) {
        await playPlaylistContext(playlist);
        return;
      }

      setTracks(nextTracks);
      setTitle(playlist.name || "Playlist");
      setView("tracks");
    } catch (playlistError) {
      const isRestrictedPlaylist =
        playlistError?.status === 403 ||
        String(playlistError?.message || "").includes("(403)");

      if (isRestrictedPlaylist) {
        await playPlaylistContext(playlist);
        return;
      }

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

  async function playAt(index) {
    const selected = tracks[index];
    if (!selected?.uri || !deviceId) {
      setError("Spotify is still preparing Velvet's playback device.");
      return;
    }

    setError("");
    clearArtistAutoplayTimer();
    artistChainRef.current = primaryArtist(selected);
    manualTrackUriRef.current = selected.uri;
    captureArtistOnNextRef.current = false;
    rememberArtistTrack(selected.uri);
    setOptimisticTrack(selected);
    saveLastTrack(selected, 0);

    try {
      await playerRef.current?.activateElement?.();

      await spotifyApi(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
        method: "PUT",
        body: JSON.stringify({ uris: [selected.uri] }),
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
      clearArtistAutoplayTimer();
      artistChainRef.current = null;
      captureArtistOnNextRef.current = true;
      manualTrackUriRef.current = "";
      await playerRef.current?.previousTrack?.();
    } catch (playError) {
      setError(friendlySpotifyError(playError));
    }
  }

  async function nextTrack() {
    try {
      clearArtistAutoplayTimer();
      artistChainRef.current = null;
      captureArtistOnNextRef.current = true;
      manualTrackUriRef.current = "";
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
            <div className="velvet-spotify-search">
              <Search size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Busca cualquier canción en Spotify"
                aria-label="Buscar canciones en Spotify"
                autoComplete="off"
              />
              {searchBusy ? (
                <LoaderCircle className="spin" size={16} aria-label="Buscando" />
              ) : query ? (
                <button type="button" onClick={() => setQuery("")} aria-label="Limpiar búsqueda">
                  <X size={15} />
                </button>
              ) : null}
            </div>

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
                    {(busy || searchBusy) && <LoaderCircle className="spin" size={15} />}
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
                  {(error.toLowerCase().includes("expired") || error.toLowerCase().includes("session")) && (
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
