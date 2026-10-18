import React from 'https://esm.sh/react@19.2.0';
import { createRoot } from 'https://esm.sh/react-dom@19.2.0/client';
import Scanner from './orvayne-scanner.js';
const settings={
 color1:'#5227FF',color2:'#FF9FFC',color3:'#FFFFFF',
 speed:.5,sweepSpeed:.25,sweepWidth:1.6,trail:.5,ripple:.22,
 bandDensity:11,glow:.6,scanDirection:'vertical',colorSpread:.7,
 scanline:true,scanlineIntensity:.5,mouseInteraction:true,
 clickEffect:'ping',reverse:false,scale:1.5,frequency:2,lineWidth:1.2,
 brightness:1,vignette:.3,grain:true,grainIntensity:.04,opacity:1,
 mouseMode:'repel',mouseRadius:.5,mouseStrength:.7,intro:true,lightMode:false
};
try{createRoot(document.getElementById('effect')).render(React.createElement(Scanner,settings))}
catch(error){console.error(error);document.getElementById('status').textContent='El efecto no pudo iniciarse';}
