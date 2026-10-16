import { useEffect, useRef } from "react";
import "./VelvetStarburst.css";

// Original two-layer radial bloom, independently implemented for Velvet Stories.
// Inspired by the visual idea, not copied from React Bits Pro.
const SETTINGS = {
  speed: .6, density: .5, starCount: 100, color: "#e3b3ea",
  starSize: .3, twinkleSpeed: .2, wobbleAmount: .6,
  innerLayerIntensity: 1, outerLayerIntensity: 1.5,
  centerX: .5, centerY: .5, brightness: 1, opacity: 1,
  flowerIntensity: .5, fadeHeight: 2.5
};
function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export default function VelvetStarburst() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const [r,g,b] = hexRgb(SETTINGS.color);
    let width = 0, height = 0, raf = 0, frame = 0, running = true;
    const stars = Array.from({ length: SETTINGS.starCount }, (_, i) => ({
      angle: (i / SETTINGS.starCount) * Math.PI * 2,
      phase: ((i * 0.61803398875) % 1) * Math.PI * 2,
      depth: .55 + ((i * 37) % 29) / 29,
      size: .75 + ((i * 13) % 11) / 11
    }));
    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width; height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function sparkle(x,y,size,alpha) {
      if (alpha <= .01) return;
      ctx.save();
      ctx.translate(x,y);
      ctx.globalAlpha = Math.min(1,alpha);
      ctx.shadowColor = "rgba(" + r + "," + g + "," + b + ",.9)";
      ctx.shadowBlur = size * 5;
      ctx.strokeStyle = "rgb(" + r + "," + g + "," + b + ")";
      ctx.lineWidth = Math.max(.7,size*.15);
      ctx.beginPath();
      ctx.moveTo(-size*2.4,0);ctx.lineTo(size*2.4,0);
      ctx.moveTo(0,-size*2.4);ctx.lineTo(0,size*2.4);
      ctx.stroke();
      ctx.fillStyle = "#f7f0ed";
      ctx.beginPath();ctx.arc(0,0,Math.max(.6,size*.26),0,Math.PI*2);ctx.fill();
      ctx.restore();
    }
    function draw() {
      ctx.clearRect(0,0,width,height);
      const t = motionQuery.matches ? 0 : frame * .009 * SETTINGS.speed;
      const cx = width * SETTINGS.centerX;
      const cy = height * SETTINGS.centerY;
      const extent = Math.max(width,height) * .55;
      // Bloom center: soft overlapping petals, not a flat scatter of points.
      const bloom = ctx.createRadialGradient(cx,cy,0,cx,cy,extent*.31);
      bloom.addColorStop(0,"rgba(227,179,234,.15)");
      bloom.addColorStop(.25,"rgba(188,131,152,.085)");
      bloom.addColorStop(1,"rgba(188,131,152,0)");
      ctx.fillStyle = bloom;
      ctx.fillRect(0,0,width,height);
      for (let layer=0;layer<2;layer++) {
        const inner = layer === 0;
        const intensity = inner ? SETTINGS.innerLayerIntensity : SETTINGS.outerLayerIntensity;
        const spread = inner ? .43 : 1;
        for (let i=0;i<stars.length;i++) {
          const p = stars[i];
          const a = p.angle + (inner ? .045 : 0);
          const petals = 1 + SETTINGS.flowerIntensity * .33 * Math.cos(6*a - t*.6);
          const wobble = SETTINGS.wobbleAmount * .027 * Math.sin(t*1.3 + a*4 + p.phase);
          const radius = extent * spread * (.17 + .77*p.depth) * (petals+wobble) * SETTINGS.density/.5;
          const x = cx + Math.cos(a+t*.035*(inner?-1:1)) * radius;
          const y = cy + Math.sin(a+t*.035*(inner?-1:1)) * radius * .82;
          const edge = Math.max(0,1-Math.pow(Math.abs(y-cy)/(height*.5),SETTINGS.fadeHeight));
          const twinkle = .68 + .32*Math.sin(t*SETTINGS.twinkleSpeed*12+p.phase*3);
          const alpha = Math.min(.9, (.32+ .26*p.depth)*intensity*twinkle*edge*SETTINGS.brightness*SETTINGS.opacity);
          const size = (1.3+SETTINGS.starSize*3.5)*p.size*(inner?.8:1);
          sparkle(x,y,size,alpha);
        }
      }
      if (running && !motionQuery.matches && !document.hidden) {
        frame++;
        raf = requestAnimationFrame(draw);
      }
    }
    const observer = new ResizeObserver(() => { resize(); if (motionQuery.matches) draw(); });
    observer.observe(canvas);
    resize(); draw();
    function visibility() { cancelAnimationFrame(raf); if (!document.hidden) draw(); }
    document.addEventListener("visibilitychange",visibility);
    return () => { running=false;cancelAnimationFrame(raf);observer.disconnect();document.removeEventListener("visibilitychange",visibility); };
  },[]);
  return <canvas ref={ref} className="velvet-starburst" aria-hidden="true"/>;
}
