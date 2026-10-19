import React from 'https://esm.sh/react@19.2.0';
import { createRoot } from 'https://esm.sh/react-dom@19.2.0/client';
import MoltenMetal from './orvayne-molten-metal.js';
const isLight=new URLSearchParams(location.search).get('theme')==='light';
const settings={
 colors:isLight?['#A18AC8','#C9B9E3']:['#251136','#68418C','#A47AC8'],coreColor:isLight?'#E5DDF1':'#D6B9E8',
 speed:.38,scale:2.35,detail:4,glow:1.12,thickness:1.28,haze:.48,
 mouseInteraction:true,flareOnClick:true,lightMode:isLight,
 swirl:1.1,turbulence:.22,brightness:isLight?.82:.95,colorMode:'molten',
 rotation:0,offsetX:0,offsetY:0,grain:.065,opacity:.92,
 drift:.42,intro:true,mouseStrength:.24,paused:false
};
try{createRoot(document.getElementById('effect')).render(React.createElement(MoltenMetal,settings))}
catch(error){console.error(error);document.getElementById('status').textContent='El efecto 3D no pudo iniciarse';}
