import React from 'https://esm.sh/react@19.2.0';
import { createRoot } from 'https://esm.sh/react-dom@19.2.0/client';
import GhostFibers from './orvayne-ghost-fibers.js';
const settings = {
 glowColor:'#8b5cf6',layers:3,twist:1.2,threads:72,fiberStyle:'dots',
 depthOfField:.85,hoverEffect:'focus',intro:true,mouseInteraction:true,
 lineColor:'#dfd1fc',secondaryColor:'#6f4ac5',gradient:'depth',
 waves:1,volume:.7,spread:1,scale:1,rotation:18,perspective:.65,
 density:1,thickness:1,tips:0,foldGlow:1,speed:.5,flow:.4,
 rollSpeed:.15,focusDepth:0,particles:.5,sparkle:.5,glow:.8,
 brightness:1,vignette:.3,grain:.06,mouseStrength:1,pulseOnClick:true,lightMode:false
};
try { createRoot(document.getElementById('effect')).render(React.createElement(GhostFibers,settings)); }
catch(error){ console.error(error); document.getElementById('status').textContent='El efecto no pudo iniciarse'; }
