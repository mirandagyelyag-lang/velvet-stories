import { createContext, useContext, useEffect, useRef, useState } from "react";
import { disconnectSpotify, loadSpotifySdk, spotifyApi, spotifyConfigured, spotifyToken } from "../services/spotify";
const C=createContext(null);
export function SpotifyProvider({children}){
 const ref=useRef(null),[deviceId,setDeviceId]=useState(""),[connected,setConnected]=useState(false),[state,setState]=useState(null),[error,setError]=useState("");
 useEffect(()=>{let alive=true,player=null;(async()=>{try{
  const token=await spotifyToken(); if(!token||!spotifyConfigured||!alive)return;
  const Spotify=await loadSpotifySdk(); if(!alive)return;
  player=new Spotify.Player({name:"Velvet Stories",getOAuthToken:async cb=>cb(await spotifyToken()),volume:.55});ref.current=player;
  player.addListener("ready",async({device_id})=>{if(!alive)return;setDeviceId(device_id);setConnected(true);setError("");try{await spotifyApi("/me/player",{method:"PUT",body:JSON.stringify({device_ids:[device_id],play:false})})}catch(e){setError(e.message)}});
  player.addListener("not_ready",()=>alive&&setConnected(false));
  for(const [event,label] of [["initialization_error","Player"],["authentication_error","Authentication"],["account_error","Account"],["playback_error","Playback"]]) player.addListener(event,({message})=>alive&&setError(`${label}: ${message||"Spotify error"}`));
  player.addListener("player_state_changed",s=>{if(alive&&s)setState(s)});
  const ok=await player.connect();if(!ok&&alive)setError("Spotify player could not connect.");
 }catch(e){if(alive)setError(e?.message||"Spotify could not start.")}})();
 return()=>{alive=false;try{player?.disconnect()}catch{};ref.current=null}
 },[]);
 const api=async(path,opt={})=>spotifyApi(path,opt);
 const playUris=async(uris,index=0)=>{if(!deviceId||!uris?.length)return;await api(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`,{method:"PUT",body:JSON.stringify({uris,offset:{position:index}})})};
 const value={player:ref,deviceId,connected,state,error,setError,api,playUris,disconnect(){try{ref.current?.disconnect()}catch{}disconnectSpotify();setConnected(false);setState(null)}};
 return <C.Provider value={value}>{children}</C.Provider>
}
export const useSpotify=()=>useContext(C);
