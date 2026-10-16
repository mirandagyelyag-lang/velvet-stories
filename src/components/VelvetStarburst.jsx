import { useEffect, useRef } from "react";
import "./VelvetStarburst.css";

// Original decorative radial starlight field; no paid library source or images.
export default function VelvetStarburst() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, raf = 0, frame = 0;
    const stars = Array.from({ length: 125 }, (_, i) => {
      const angle = i * 2.399963229728653;
      const radius = Math.sqrt((i + .5) / 125);
      return { angle, radius, phase: (i * 0.61803398875) % 1, size: .45 + (i % 7) * .12 };
    });
    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(canvas); resize();
    function draw() {
      ctx.clearRect(0, 0, w, h);
      const cx = w * .5, cy = h * .5;
      const maxR = Math.hypot(w, h) * .52;
      for (const star of stars) {
        const pulse = reduced ? 0 : frame * .00065;
        const dist = ((star.radius + pulse + star.phase * .06) % 1) * maxR;
        const x = cx + Math.cos(star.angle) * dist;
        const y = cy + Math.sin(star.angle) * dist * .75;
        const fade = Math.min(1, dist / (maxR * .18)) * Math.max(0, 1 - dist / maxR);
        const twinkle = reduced ? .75 : .65 + .35 * Math.sin(frame * .018 + star.phase * 15);
        const alpha = fade * twinkle * .48;
        if (alpha < .015) continue;
        ctx.strokeStyle = "rgba(235,218,205," + alpha.toFixed(3) + ")";
        ctx.lineWidth = .7;
        const r = star.size * (1 + dist / maxR);
        ctx.beginPath();
        ctx.moveTo(x-r*2.3,y);ctx.lineTo(x+r*2.3,y);
        ctx.moveTo(x,y-r*2.3);ctx.lineTo(x,y+r*2.3);
        ctx.stroke();
        ctx.fillStyle = "rgba(217,183,196," + (alpha*.65).toFixed(3) + ")";
        ctx.beginPath();ctx.arc(x,y,.65,0,Math.PI*2);ctx.fill();
      }
      if (!reduced && !document.hidden) { frame++; raf = requestAnimationFrame(draw); }
    }
    draw();
    const visibility = () => { cancelAnimationFrame(raf); if (!document.hidden) draw(); };
    document.addEventListener("visibilitychange", visibility);
    return () => { cancelAnimationFrame(raf); observer.disconnect(); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  return <canvas ref={ref} className="velvet-starburst" aria-hidden="true" />;
}
