// Velvet Stories v3.52.56 · Spotify PKCE + Web Playback SDK
const CLIENT_ID = String(import.meta.env.VITE_SPOTIFY_CLIENT_ID || "").trim();
const TOKEN_KEY = "velvet:spotify:tokens:v1";
const VERIFIER_KEY = "velvet:spotify:pkce:v1";
const SCOPES = [
  "streaming",
  "user-read-private",
  "user-read-email",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
].join(" ");

export const spotifyConfigured = Boolean(CLIENT_ID);

function redirectUri() {
  return `${window.location.origin}${window.location.pathname}`;
}
function b64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function challenge(verifier) {
  return b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
}
function randomVerifier() {
  const bytes = crypto.getRandomValues(new Uint8Array(64));
  return b64url(bytes);
}
function readTokens() {
  try { return JSON.parse(localStorage.getItem(TOKEN_KEY) || "null"); } catch { return null; }
}
function saveTokens(data) {
  const old=readTokens() || {};
  const next={...old,...data, expires_at: Date.now() + Math.max(30, Number(data.expires_in || 3600)-30)*1000};
  localStorage.setItem(TOKEN_KEY, JSON.stringify(next));
  return next;
}
export function disconnectSpotify() {
  localStorage.removeItem(TOKEN_KEY);
}
export async function beginSpotifyLogin() {
  if (!CLIENT_ID) throw new Error("Add VITE_SPOTIFY_CLIENT_ID to .env first.");
  const verifier=randomVerifier();
  localStorage.setItem(VERIFIER_KEY, verifier);
  const url=new URL("https://accounts.spotify.com/authorize");
  url.search=new URLSearchParams({
    client_id:CLIENT_ID, response_type:"code", redirect_uri:redirectUri(),
    scope:SCOPES, code_challenge_method:"S256", code_challenge:await challenge(verifier),
  }).toString();
  window.location.assign(url.toString());
}
export async function finishSpotifyLoginFromUrl() {
  const url=new URL(window.location.href);
  const code=url.searchParams.get("code");
  const error=url.searchParams.get("error");
  if (error) {
    url.searchParams.delete("error"); history.replaceState({}, "", url.pathname+url.search+url.hash);
    throw new Error(`Spotify authorization: ${error}`);
  }
  if (!code) return false;
  const verifier=localStorage.getItem(VERIFIER_KEY);
  if (!verifier) throw new Error("Spotify login expired. Connect again.");
  const body=new URLSearchParams({
    client_id:CLIENT_ID, grant_type:"authorization_code", code,
    redirect_uri:redirectUri(), code_verifier:verifier,
  });
  const res=await fetch("https://accounts.spotify.com/api/token",{
    method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body
  });
  if(!res.ok) throw new Error("Spotify could not finish authorization.");
  saveTokens(await res.json());
  localStorage.removeItem(VERIFIER_KEY);
  url.searchParams.delete("code"); url.searchParams.delete("state");
  history.replaceState({}, "", url.pathname+url.search+url.hash);
  return true;
}
export async function spotifyToken() {
  let t=readTokens();
  if(!t?.access_token) return "";
  if(Date.now() < Number(t.expires_at||0)) return t.access_token;
  if(!t.refresh_token) { disconnectSpotify(); return ""; }
  const body=new URLSearchParams({client_id:CLIENT_ID,grant_type:"refresh_token",refresh_token:t.refresh_token});
  const res=await fetch("https://accounts.spotify.com/api/token",{
    method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body
  });
  if(!res.ok){ disconnectSpotify(); return ""; }
  t=saveTokens(await res.json());
  return t.access_token;
}
export async function spotifyApi(path, options={}) {
  const token=await spotifyToken();
  if(!token) throw new Error("Spotify is not connected.");
  const res=await fetch(`https://api.spotify.com/v1${path}`,{
    ...options, headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json",...(options.headers||{})}
  });
  if(res.status===204) return null;
  if(res.status===401){ disconnectSpotify(); throw new Error("Spotify session expired. Connect again."); }
  if(!res.ok) throw new Error(`Spotify request failed (${res.status}).`);
  return res.json();
}
let sdkPromise;
export function loadSpotifySdk() {
  if(window.Spotify) return Promise.resolve(window.Spotify);
  if(sdkPromise) return sdkPromise;
  sdkPromise=new Promise((resolve,reject)=>{
    window.onSpotifyWebPlaybackSDKReady=()=>resolve(window.Spotify);
    const old=document.querySelector('script[data-velvet-spotify-sdk]');
    if(old) return;
    const s=document.createElement("script");
    s.src="https://sdk.scdn.co/spotify-player.js"; s.async=true; s.dataset.velvetSpotifySdk="1";
    s.onerror=()=>reject(new Error("Spotify player SDK could not load."));
    document.head.appendChild(s);
  });
  return sdkPromise;
}
