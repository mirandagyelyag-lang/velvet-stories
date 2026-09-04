import { useEffect } from "react";
import { setNativeLaunchFullscreen } from "../native/velvetNative";

const shards = [
  { points:"150,12 88,48 109,126 150,100", cls:"a", x:"-48vw", y:"-28vh", r:"-72deg", d:".02s" },
  { points:"150,12 212,48 191,126 150,100", cls:"b", x:"46vw", y:"-30vh", r:"66deg", d:".08s" },
  { points:"88,48 32,124 109,126", cls:"c", x:"-60vw", y:"-8vh", r:"-108deg", d:".14s" },
  { points:"212,48 268,124 191,126", cls:"d", x:"58vw", y:"-6vh", r:"102deg", d:".18s" },
  { points:"32,124 109,126 150,190 64,214", cls:"e", x:"-58vw", y:"12vh", r:"-86deg", d:".22s" },
  { points:"268,124 191,126 150,190 236,214", cls:"f", x:"60vw", y:"10vh", r:"84deg", d:".26s" },
  { points:"109,126 150,100 150,190", cls:"g", x:"-24vw", y:"-42vh", r:"-146deg", d:".30s" },
  { points:"191,126 150,100 150,190", cls:"h", x:"28vw", y:"-42vh", r:"142deg", d:".34s" },
  { points:"64,214 150,190 140,280 52,302", cls:"i", x:"-62vw", y:"30vh", r:"-58deg", d:".38s" },
  { points:"236,214 150,190 160,280 248,302", cls:"j", x:"62vw", y:"28vh", r:"62deg", d:".42s" },
  { points:"52,302 140,280 150,392 84,360", cls:"k", x:"-38vw", y:"54vh", r:"-122deg", d:".46s" },
  { points:"248,302 160,280 150,392 216,360", cls:"l", x:"40vw", y:"52vh", r:"118deg", d:".50s" },
];

export default function NativeMirrorLaunch() {
  useEffect(() => {
    setNativeLaunchFullscreen(true);
    return () => setNativeLaunchFullscreen(false);
  }, []);

  return (
    <main className="app-loading app-loading--native velvet-true-mirror" aria-label="Velvet is opening">
      <div className="velvet-true-mirror__aurora" aria-hidden="true"><i/><i/></div>

      <div className="velvet-true-mirror__stage" aria-hidden="true">
        <svg className="velvet-true-mirror__glass" viewBox="0 0 300 404" role="presentation">
          <defs>
            <linearGradient id="vmA" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff7fb" stopOpacity=".86"/>
              <stop offset=".2" stopColor="#ffc4dc" stopOpacity=".34"/>
              <stop offset=".52" stopColor="#711f47" stopOpacity=".54"/>
              <stop offset=".72" stopColor="#f690bd" stopOpacity=".26"/>
              <stop offset="1" stopColor="#25101d" stopOpacity=".82"/>
            </linearGradient>
            <linearGradient id="vmB" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f7f2f5" stopOpacity=".72"/>
              <stop offset=".25" stopColor="#a44a75" stopOpacity=".34"/>
              <stop offset=".55" stopColor="#351120" stopOpacity=".74"/>
              <stop offset=".78" stopColor="#ffafd0" stopOpacity=".25"/>
              <stop offset="1" stopColor="#fff" stopOpacity=".5"/>
            </linearGradient>
            <linearGradient id="vmC" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#200b16" stopOpacity=".82"/>
              <stop offset=".38" stopColor="#8a315e" stopOpacity=".42"/>
              <stop offset=".62" stopColor="#ffd8e8" stopOpacity=".58"/>
              <stop offset="1" stopColor="#401328" stopOpacity=".76"/>
            </linearGradient>
            <filter id="vmGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ee6ba5" floodOpacity=".28"/>
            </filter>
          </defs>

          <path className="velvet-true-mirror__outline" d="M150 12 88 48 32 124 52 302 84 360 150 392 216 360 248 302 268 124 212 48Z"/>

          <g className="velvet-true-mirror__shards" filter="url(#vmGlow)">
            {shards.map((s, index) => (
              <polygon
                key={s.cls}
                className={`velvet-true-mirror__shard velvet-true-mirror__shard--${s.cls}`}
                points={s.points}
                fill={`url(#${index % 3 === 0 ? "vmA" : index % 3 === 1 ? "vmB" : "vmC"})`}
                style={{ "--x": s.x, "--y": s.y, "--r": s.r, "--d": s.d }}
              />
            ))}
          </g>

          <g className="velvet-true-mirror__cracks">
            <path d="M150 100 109 126 64 214 140 280 84 360"/>
            <path d="M150 100 191 126 236 214 160 280 216 360"/>
            <path d="M32 124 109 126 150 190 191 126 268 124"/>
            <path d="M52 302 140 280 150 190 160 280 248 302"/>
          </g>
        </svg>

        <div className="velvet-true-mirror__vs">VS</div>
        <div className="velvet-true-mirror__glint" />
        <div className="velvet-true-mirror__star velvet-true-mirror__star--1">✦</div>
        <div className="velvet-true-mirror__star velvet-true-mirror__star--2">✦</div>
      </div>

      <div className="velvet-true-mirror__dots" aria-hidden="true"><i/><i/><i/></div>
      <div className="velvet-true-mirror__flash" aria-hidden="true" />
    </main>
  );
}
