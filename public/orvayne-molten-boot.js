import React from 'https://esm.sh/react@19.2.0';
import { createRoot } from 'https://esm.sh/react-dom@19.2.0/client';
import MoltenMetal from './orvayne-molten-metal.js';
const isLight=new URLSearchParams(location.search).get('theme')==='light';
const settings={
 colors:isLight?['#BC8398','#D9B7C4']:['#5227FF','#FF9FFC'],coreColor:isLight?'#FFF8FC':'#FFFFFF',
 speed:.35,scale:4,detail:3,glow:1.6,thickness:1,haze:.75,
 mouseInteraction:true,flareOnClick:true,lightMode:isLight,
 swirl:1,turbulence:.2,brightness:isLight?.85:1.3,colorMode:'molten',
 rotation:0,offsetX:0,offsetY:0,grain:.05,opacity:1,
 drift:.3,intro:true,mouseStrength:.5,paused:false
};
try{createRoot(document.getElementById('effect')).render(React.createElement(MoltenMetal,settings))}
catch(error){console.error(error);document.getElementById('status').textContent='El efecto 3D no pudo iniciarse';}
