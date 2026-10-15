import { useEffect, useRef } from "react";
import "./VelvetGlyphOrb.css";

// Original point-cloud glyph sphere; no images, external packages or Pro code.
export default function VelvetGlyphOrb() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const glyphs = ["·", "✦", "+", "×", ":", "v", "•"];
    const points = Array.from({ length: 210 }, (_, i) => {
      const y = 1 - (i / 209) * 2;
      const r = Math.sqrt(1 - y * y);
      const a = i * Math.PI * (3 - Math.sqrt(5));
      return { x: Math.cos(a) * r, y, z: Math.sin(a) * r, glyph: glyphs[i % glyphs.length] };
    });
    let frame = 0, raf, width = 0, height = 0, active = true;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width; height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas); resize();
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const radius = Math.min(width, height) * .42;
      const angle = reduced ? .3 : frame * .0035;
      const tilt = -.28;
      const c = Math.cos(angle), s = Math.sin(angle);
      const ct = Math.cos(tilt), st = Math.sin(tilt);
      const projected = points.map(p => {
        const x = p.x * c + p.z * s;
        const z = -p.x * s + p.z * c;
        const y = p.y * ct - z * st;
        const depth = p.y * st + z * ct;
        return { x: width / 2 + x * radius, y: height / 2 + y * radius, depth, glyph: p.glyph };
      }).sort((a,b) => a.depth - b.depth);
      projected.forEach(p => {
        const opacity = .16 + (p.depth + 1) * .33;
        ctx.fillStyle = "rgba(217,183,196," + opacity.toFixed(3) + ")";
        ctx.font = (8 + (p.depth + 1) * 3) + "px Georgia,serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.glyph, p.x, p.y);
      });
      if (active && !reduced) { frame++; raf = requestAnimationFrame(draw); }
    };
    draw();
    const onVisibility = () => {
      active = !document.hidden;
      cancelAnimationFrame(raf);
      if (active) draw();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { active = false; cancelAnimationFrame(raf); observer.disconnect(); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);
  return <div className="velvet-glyph-orb" aria-hidden="true"><canvas ref={canvasRef} /></div>;
}
