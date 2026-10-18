import React from 'https://esm.sh/react@19.2.0';
import { createRoot } from 'https://esm.sh/react-dom@19.2.0/client';
import MoltenMetal from './orvayne-molten-metal.js';
const isLight=new URLSearchParams(location.search).get('theme')==='light';
const settings={
 colors:isLight?['#8C6BC9','#C0A5F2']:['#6326C9','#B78AFF'],coreColor:isLight?'#EDE2FF':'#F3E8FF',
 speed:.48,scale:2.05,detail:4,glow:2.05,thickness:2.15,haze:.28,
 mouseInteraction:true,flareOnClick:true,lightMode:isLight,
 swirl:1.3,turbulence:.28,brightness:isLight?1.05:1.75,colorMode:'molten',
 rotation:0,offsetX:0,offsetY:0,grain:.05,opacity:1,
 drift:.55,intro:true,mouseStrength:.5,paused:false
};
try{createRoot(document.getElementById('effect')).render(React.createElement(MoltenMetal,settings))}
catch(error){console.error(error);document.getElementById('status').textContent='El efecto 3D no pudo iniciarse';}
