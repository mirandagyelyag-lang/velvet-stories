import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ExternalLink, Music2, Pause, Play, SkipBack, SkipForward, Unplug, Volume2 } from "lucide-react";
import { beginSpotifyLogin, disconnectSpotify, finishSpotifyLoginFromUrl, loadSpotifySdk, spotifyApi, spotifyConfigured, spotifyToken } from "../services/spotify";

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

  useEffect(()=>{ let alive=true;
    (async()=>{
      try{
        await finishSpotifyLoginFromUrl();
        const token=await spotifyToken();
        if(!token||!spotifyConfigured||!alive) return;
        const Spotify=await loadSpotifySdk();
        if(!alive) return;
        const player=new Spotify.Player({name:"Velvet Stories",getOAuthToken:async cb=>cb(await spotifyToken()),volume});
        playerRef.current=player;
        player.addListener("ready",({device_id})=>{setDeviceId(device_id);setConnected(true)});
        player.addListener("not_ready",()=>setConnected(false));
        player.addListener("authentication_error",({message})=>setError(message||"Spotify authentication failed."));
        player.addListener("account_error",()=>setError("Spotify Premium is required for Velvet playback."));
        player.addListener("playback_error",({message})=>setError(message||"Spotify playback failed."));
        player.addListener("player_state_changed",(s)=>{
          if(!s)return; setState(s);
          const track=s.track_window?.current_track;
          if(track&&storyId) localStorage.setItem(storyKey(storyId),JSON.stringify({
            uri:track.uri, position:s.position||0, name:track.name,
            artist:track.artists?.map(a=>a.name).join(", ")||"", image:track.album?.images?.[0]?.url||""
          }));
        });
        await player.connect();
      }catch(e){ if(alive)setError(e.message||"Spotify could not start."); }
    })();
    return()=>{alive=false; playerRef.current?.disconnect?.(); playerRef.current=null};
  },[]);

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
