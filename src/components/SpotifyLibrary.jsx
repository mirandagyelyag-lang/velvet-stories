import { useEffect,useState } from "react";
import { ChevronLeft,Music2,Pause,Play,Search,SkipBack,SkipForward,Unplug,Volume2 } from "lucide-react";
import { beginSpotifyLogin,spotifyConfigured } from "../services/spotify";
import { useSpotify } from "../context/SpotifyContext";
const img=x=>x?.images?.[0]?.url||x?.album?.images?.[0]?.url||"";
export default function SpotifyLibrary({open,onClose}){
 const S=useSpotify(),[tab,setTab]=useState("library"),[playlists,setPlaylists]=useState([]),[tracks,setTracks]=useState([]),[selected,setSelected]=useState(null),[q,setQ]=useState(""),[busy,setBusy]=useState(false),[volume,setVolume]=useState(.55);
 useEffect(()=>{if(open&&S.connected&&!playlists.length)loadLibrary()},[open,S.connected]);
 async function loadLibrary(){setBusy(true);try{const d=await S.api("/me/playlists?limit=50");setPlaylists(d?.items||[])}catch(e){S.setError(e.message)}finally{setBusy(false)}}
 async function openPlaylist(p){setSelected(p);setBusy(true);try{const d=await S.api(`/playlists/${p.id}/items?limit=50`);setTracks((d?.items||[]).map(x=>x.item||x.track).filter(x=>x?.uri));setTab("playlist")}catch(e){S.setError(e.message)}finally{setBusy(false)}}
 async function search(e){e?.preventDefault();if(!q.trim())return;setBusy(true);try{const d=await S.api(`/search?q=${encodeURIComponent(q.trim())}&type=track&limit=10`);setTracks(d?.tracks?.items||[]);setSelected({name:`Search · ${q}`});setTab("search")}catch(e){S.setError(e.message)}finally{setBusy(false)}}
 async function playAt(i){try{await S.playUris(tracks.map(t=>t.uri),i)}catch(e){S.setError(e.message)}}
 if(!open)return null;
 const current=S.state?.track_window?.current_track,paused=S.state?.paused!==false;
 return <div className="velvet-spotify-global"><button className="velvet-spotify-global__shade" onClick={onClose}/><section className="velvet-spotify-library">
  <header><button onClick={tab==="library"?onClose:()=>setTab("library")}>{tab==="library"?"×":<ChevronLeft/>}</button><div><strong>Spotify</strong><small>{S.connected?"Velvet Stories · connected":"Music across all Velvet"}</small></div></header>
  {!spotifyConfigured?<p>Spotify Client ID is missing.</p>:!S.connected?<div className="vsg-empty"><Music2/><b>Spotify</b><span>{S.error||"Connect your Spotify Premium account."}</span><button onClick={()=>beginSpotifyLogin()}>Connect</button></div>:<>
   <form className="vsg-search" onSubmit={search}><Search size={16}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search Spotify"/><button>Search</button></form>
   {tab==="library"?<div className="vsg-list"><h3>Your playlists</h3>{busy&&<small>Loading Spotify…</small>}{playlists.map(p=><button className="vsg-row" key={p.id} onClick={()=>openPlaylist(p)}>{img(p)?<img src={img(p)} alt=""/>:<i><Music2/></i>}<span><b>{p.name}</b><small>{p.items?.total??p.tracks?.total??""} songs</small></span></button>)}</div>:<div className="vsg-list"><h3>{selected?.name}</h3>{busy&&<small>Loading…</small>}{tracks.map((t,i)=><button className="vsg-row" key={`${t.id}-${i}`} onClick={()=>playAt(i)}>{img(t)?<img src={img(t)} alt=""/>:<i><Music2/></i>}<span><b>{t.name}</b><small>{t.artists?.map(a=>a.name).join(", ")}</small></span><Play size={15}/></button>)}</div>}
   <footer>{current?<><div className="vsg-now">{img(current)?<img src={img(current)} alt=""/>:<Music2/>}<span><b>{current.name}</b><small>{current.artists?.map(a=>a.name).join(", ")}</small></span></div><div className="vsg-controls"><button onClick={()=>S.player.current?.previousTrack()}><SkipBack/></button><button onClick={()=>S.player.current?.togglePlay()}>{paused?<Play/>:<Pause/>}</button><button onClick={()=>S.player.current?.nextTrack()}><SkipForward/></button></div></>:<small>Choose a song to start listening</small>}<div className="vsg-volume"><Volume2/><input type="range" min="0" max="1" step=".02" value={volume} onChange={e=>{const v=+e.target.value;setVolume(v);S.player.current?.setVolume(v)}}/><button onClick={S.disconnect}><Unplug/></button></div>{S.error&&<small className="vsg-error">{S.error}</small>}</footer>
  </>}
 </section></div>
}
