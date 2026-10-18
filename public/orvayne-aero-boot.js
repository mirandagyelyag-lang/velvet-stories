import React from 'https://esm.sh/react@19.2.0';
import { createRoot } from 'https://esm.sh/react-dom@19.2.0/client';
import AeroShards from './orvayne-aero-shards.js';
const fallback = () => { document.getElementById('status').textContent = 'Efecto 3D no disponible en este navegador'; };
document.getElementById('enter').addEventListener('click', () => {
  window.parent.postMessage({ type: 'velvet-original-entry-enter' }, location.origin);
});
const options = {
  shardColor:'#896ABD', accentColor:'#A855F7', placement:'full',
  material:'glass', markers:'plus', count:1300, depthOfField:.75,
  vignette:.3, mouseInteraction:true, pulseOnClick:true, holdToGather:true,
  lightMode:false, shardSize:1, spread:1, twist:1, billow:1, speed:1,
  scale:1, glow:.35, grain:.06, intro:true, mouseStrength:.6,
  parallax:.5, paused:false, onError:fallback
};
try {
  if (navigator.gpu) createRoot(document.getElementById('effect')).render(React.createElement(AeroShards, options));
  else fallback();
} catch (error) { console.error(error); fallback(); }
