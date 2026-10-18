import React from 'https://esm.sh/react@19.2.0';
import { createRoot } from 'https://esm.sh/react-dom@19.2.0/client';
import PrismaticBurst from './orvayne-prismatic-burst.js';
const settings={
 colors:['#A855F7','#7C3AED','#6366F1'],
 animationType:'rotate3d',intensity:2,speed:.5,zoom:1,rayWidth:1,
 twist:0,mouseInteraction:true,clickBurst:true,intro:true,rayCount:0,
 distort:0,flow:0,centerFade:1,glow:0,grain:.8,mouseStrength:.5,
 hoverDampness:.25,fade:0,lightMode:false
};
try{createRoot(document.getElementById('effect')).render(React.createElement(PrismaticBurst,settings))}
catch(error){console.error(error);document.getElementById('status').textContent='El efecto no pudo iniciarse';}
