import React from 'https://esm.sh/react@19.2.0';
import { createRoot } from 'https://esm.sh/react-dom@19.2.0/client';
import MoltenMetal from './orvayne-molten-metal.js';
const isLight=new URLSearchParams(location.search).get('theme')==='light';
const settings={
 colors:isLight?['#B97591','#E8B4C9']:['#8F3F78','#FFB4D2'],coreColor:isLight?'#FFF8FC':'#FFFFFF',
 speed:.48,scale:2.05,detail:4,glow:2.05,thickness:2.15,haze:.28,
 mouseInteraction:true,flareOnClick:true,lightMode:isLight,
 swirl:1.3,turbulence:.28,brightness:isLight?1.05:1.75,colorMode:'molten',
 rotation:0,offsetX:0,offsetY:0,grain:.05,opacity:1,
 drift:.55,intro:true,mouseStrength:.5,paused:false
};
try{createRoot(document.getElementById('effect')).render(React.createElement(MoltenMetal,settings))}
catch(error){console.error(error);document.getElementById('status').textContent='El efecto 3D no pudo iniciarse';}
