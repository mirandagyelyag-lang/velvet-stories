import React from 'https://esm.sh/react@19.2.0';
import { createRoot } from 'https://esm.sh/react-dom@19.2.0/client';
import MoltenMetal from './orvayne-molten-metal.js';
const theme=new URLSearchParams(location.search).get('theme');
const isLight=theme==='light';
const isComfort=theme==='comfort';
const isBright=isLight||isComfort;
const settings={
 colors:isComfort?['#86BCE9','#B7DDF8','#E1F3FF']:isLight?['#E9DEDA','#F7F0ED','#FFFFFF']:['#29103F','#6C399A','#AE7BD8'],coreColor:isComfort?'#EDF8FF':isLight?'#FFFFFF':'#D2A6EA',
 speed:.40,scale:1.82,detail:4,glow:1.85,thickness:1.62,haze:.86,
 mouseInteraction:true,flareOnClick:true,lightMode:isBright,
 swirl:1.1,turbulence:.22,brightness:isBright?1.02:1.32,colorMode:'molten',
 rotation:0,offsetX:0,offsetY:0,grain:.045,opacity:1,
 drift:.42,intro:true,mouseStrength:.24,paused:false
};
try{createRoot(document.getElementById('effect')).render(React.createElement(MoltenMetal,settings))}
catch(error){console.error(error);document.getElementById('status').textContent='El efecto 3D no pudo iniciarse';}
