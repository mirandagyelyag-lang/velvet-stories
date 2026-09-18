import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ExternalLink, Music2, Pause, Play, SkipBack, SkipForward, Unplug, Volume2 } from "lucide-react";
import { beginSpotifyLogin, disconnectSpotify, loadSpotifySdk, spotifyApi, spotifyConfigured, spotifyToken } from "../services/spotify";

const storyKey=(id)=>`velvet:spotify:story:${id||"unknown"}:v1`;
const fmt=(ms)=>`${Math.floor((ms||0)/60000)}:${String(Math.floor(((ms||0)%60000)/1000)).padStart(2,"0")}`;

export default function SpotifyPlayer({ storyId }) {
  const playerRef=useRef(null);
  const [deviceId,setDeviceId]=useState("");
  const [connected,setConnected]=useState(false);
  const [connecting,setConnecting]=useState(false);
  const [expanded,setExpanded]=useState(false);
  const [state,setState]=useState(null);
  const [error,setError]=useState("");
  const [volume,setVolume]=useState(0.55);
  const saved=useMemo(()=>{try{return JSON.parse(localStorage.getItem(storyKey(storyId))||"null")}catch{return null}},[storyId]);

  useEffect(()=>{
    const onConnected=()=>window.location.reload();
    window.addEventListener("velvet:spotify-connected",onConnected);
    return()=>window.removeEventListener("velvet:spotify-connected",onConnected);
  },[]);

  useEffect(()=>{ let alive=true; let player=null;
    (async()=>{
      try{
        setError("Starting Spotify player…");
        const token=await spotifyToken();
        if(!token) { if(alive)setError("Spotify authorization is missing. Connect again."); return; }
        if(!spotifyConfigured||!alive) return;

        const Spotify=await loadSpotifySdk();
        if(!alive) return;

        player=new Spotify.Player({
          name:"Velvet Stories",
          getOAuthToken:async cb=>{
            try{
              const fresh=await spotifyToken();
              if(!fresh) throw new Error("Spotify token unavailable.");
              cb(fresh);
            }catch(e){
              if(alive)setError(e?.message||"Spotify authentication failed.");
            }
          },
          volume
        });
        playerRef.current=player;

        player.addListener("ready",({device_id})=>{
          if(!alive)return;
          setDeviceId(device_id);
          setConnected(true);
          setConnecting(false);
          setError("");
        });
        player.addListener("not_ready",({device_id}={})=>{
          if(!alive)return;
          setConnected(false);
          setError(device_id?"Spotify device went offline.":"Spotify player is not ready.");
        });
        player.addListener("initialization_error",({message})=>alive&&setError(message||"Spotify player initialization failed."));
        player.addListener("authentication_error",({message})=>alive&&setError(message||"Spotify authentication failed."));
        player.addListener("account_error",({message})=>alive&&setError(message||"Spotify Premium account could not start playback."));
        player.addListener("playback_error",({message})=>alive&&setError(message||"Spotify playback failed."));
        player.addListener("player_state_changed",(next)=>{
          if(!next)return;
          setState(next);
          const track=next.track_window?.current_track;
          if(track&&storyId) localStorage.setItem(storyKey(storyId),JSON.stringify({
            uri:track.uri,position:next.position||0,name:track.name,
            artist:track.artists?.map(a=>a.name).join(", ")||"",
            image:track.album?.images?.[0]?.url||""
          }));
        });

        const ok=await player.connect();
        if(!ok&&alive)setError("Spotify SDK loaded, but the Velvet player could not connect.");
      }catch(e){
        console.error("Velvet Spotify player boot failed:",e);
        if(alive)setError(e?.message||"Spotify player could not start.");
      }
    })();
    return()=>{alive=false; try{player?.disconnect?.()}catch{} if(playerRef.current===player)playerRef.current=null};
  },[storyId]);

  async function connectSpotify(){
    if(connecting)return;
    setConnecting(true);
    setError("");
    try{
      await beginSpotifyLogin();
    }catch(e){
      console.error("Spotify connect failed:",e);
      setError(e?.message || "Spotify login could not start.");
      setConnecting(false);
    }
  }
  async function resumeSaved(){
    if(!saved?.uri||!deviceId)return;
    try{
      await spotifyApi(`/me/player`,{method:"PUT",body:JSON.stringify({device_ids:[deviceId],play:false})});
      await spotifyApi(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`,{method:"PUT",body:JSON.stringify({uris:[saved.uri],position_ms:saved.position||0})});
    }catch(e){setError(e.message)}
  }
  async function toggle(){try{await playerRef.current?.togglePlay()}catch(e){setError(e.message)}}
  async function prev(){try{await playerRef.current?.previousTrack()}catch(e){setError(e.message)}}
  async function next(){try{await playerRef.current?.nextTrack()}catch(e){setError(e.message)}}
  async function seek(e){
    const duration=state?.duration||0, p=Number(e.target.value||0);
    try{await playerRef.current?.seek(Math.round(duration*p/100))}catch(err){setError(err.message)}
  }
  async function changeVolume(e){
    const v=Number(e.target.value);setVolume(v);
    try{await playerRef.current?.setVolume(v)}catch(err){setError(err.message)}
  }
  function disconnect(){playerRef.current?.disconnect?.();disconnectSpotify();setConnected(false);setState(null);setDeviceId("")}

  const track=state?.track_window?.current_track;
  const title=track?.name||saved?.name||"Spotify";
  const artist=track?.artists?.map(a=>a.name).join(", ")||saved?.artist||"Music for this story";
  const image=track?.album?.images?.[0]?.url||saved?.image||"";
  const paused=state?.paused!==false;
  const progress=state?.duration?Math.min(100,(state.position/state.duration)*100):0;

  if(!spotifyConfigured) return (
    <aside className="velvet-spotify velvet-spotify--setup">
      <Music2 size={17}/><div><strong>Spotify</strong><small>Add your Client ID to finish setup</small></div>
    </aside>
  );
  if(!connected) return (
    <aside className="velvet-spotify velvet-spotify--connect">
      <Music2 size={18}/><div><strong>Spotify</strong><small>{error||"Premium · private player"}</small></div>
      <button type="button" disabled={connecting} onClick={connectSpotify}>{connecting?"Opening…":"Connect"}</button>
    </aside>
  );
  return (
    <aside className={`velvet-spotify${expanded?" is-expanded":""}`}>
      <button className="velvet-spotify__summary" type="button" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded}>
        {image?<img src={image} alt=""/>:<span className="velvet-spotify__art"><Music2 size={18}/></span>}
        <span className="velvet-spotify__meta"><strong>{title}</strong><small>{artist}</small></span>
        <ChevronDown className="velvet-spotify__chev" size={17}/>
      </button>
      {expanded&&<div className="velvet-spotify__body">
        {!track&&saved?.uri&&<button className="velvet-spotify__resume" type="button" onClick={resumeSaved}>Resume this story’s song</button>}
        <div className="velvet-spotify__controls">
          <button type="button" onClick={prev} aria-label="Previous"><SkipBack size={19}/></button>
          <button className="velvet-spotify__play" type="button" onClick={toggle} aria-label={paused?"Play":"Pause"}>{paused?<Play size={20}/>:<Pause size={20}/>}</button>
          <button type="button" onClick={next} aria-label="Next"><SkipForward size={19}/></button>
        </div>
        <div className="velvet-spotify__timeline"><span>{fmt(state?.position)}</span><input type="range" min="0" max="100" step=".1" value={progress} onChange={seek}/><span>{fmt(state?.duration)}</span></div>
        <div className="velvet-spotify__volume"><Volume2 size={15}/><input type="range" min="0" max="1" step=".02" value={volume} onChange={changeVolume}/><button type="button" onClick={disconnect} title="Disconnect Spotify"><Unplug size={15}/></button>{track?.uri&&<a href={`https://open.spotify.com/track/${track.uri.split(":").pop()}`} target="_blank" rel="noreferrer" title="Open in Spotify"><ExternalLink size={15}/></a>}</div>
        {error&&<small className="velvet-spotify__error">{error}</small>}
      </div>}
    </aside>
  );
}
