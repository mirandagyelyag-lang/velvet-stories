import React from 'https://esm.sh/react@19.2.0';
import { createRoot } from 'https://esm.sh/react-dom@19.2.0/client';
import LiquidEther from './orvayne-liquid-ether.js';
const settings={
 colors:['#5227FF','#FF9FFC','#B497CF'],
 mouseForce:20,cursorSize:100,persistence:.75,autoDemo:true,
 autoSpeed:.5,autoIntensity:2.2,intensity:1,viscosity:0,
 resolution:.5,clickBurst:true,bounceEdges:false,intro:true,lightMode:false
};
try{createRoot(document.getElementById('effect')).render(React.createElement(LiquidEther,settings))}
catch(error){console.error(error);document.getElementById('status').textContent='El efecto no pudo iniciarse';}
