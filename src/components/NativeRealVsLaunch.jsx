import { useEffect } from "react";
import { setNativeLaunchFullscreen } from "../native/velvetNative";

const shards = [
  { points: "8,12 24,6 20,28 5,24", tx: -32, ty: -20, rot: -18, ox: -38, oy: -24, or: -24, delay: 0.02 },
  { points: "28,8 42,4 40,24 25,25", tx: 0, ty: -28, rot: 10, ox: 0, oy: -36, or: 15, delay: 0.12 },
  { points: "62,6 76,10 73,28 58,21", tx: 20, ty: -26, rot: 18, ox: 26, oy: -34, or: 24, delay: 0.07 },
  { points: "82,12 95,18 89,36 77,30", tx: 34, ty: -12, rot: 22, ox: 40, oy: -16, or: 28, delay: 0.18 },
  { points: "7,54 20,46 22,68 10,72", tx: -35, ty: -2, rot: -16, ox: -44, oy: -4, or: -22, delay: 0.24 },
  { points: "80,48 94,43 96,68 84,74", tx: 36, ty: 2, rot: 12, ox: 44, oy: 4, or: 18, delay: 0.20 },
  { points: "12,120 26,112 30,138 15,144", tx: -30, ty: 18, rot: -18, ox: -38, oy: 24, or: -24, delay: 0.33 },
  { points: "31,136 45,126 48,154 33,159", tx: -10, ty: 26, rot: 12, ox: -12, oy: 36, or: 18, delay: 0.42 },
  { points: "55,132 69,123 71,151 57,155", tx: 10, ty: 24, rot: -10, ox: 12, oy: 34, or: -16, delay: 0.38 },
  { points: "74,120 90,114 94,141 80,147", tx: 30, ty: 19, rot: 16, ox: 38, oy: 26, or: 22, delay: 0.30 },
  { points: "22,82 32,74 36,92 26,100", tx: -18, ty: 4, rot: -10, ox: -24, oy: 6, or: -15, delay: 0.49 },
  { points: "66,78 79,72 82,91 70,98", tx: 18, ty: 6, rot: 9, ox: 24, oy: 8, or: 14, delay: 0.45 },
];

const sparkles = [
  { x: 14, y: 20, size: 1.4, delay: 2.18 },
  { x: 82, y: 18, size: 1.1, delay: 2.46 },
  { x: 20, y: 40, size: 0.9, delay: 2.68 },
  { x: 74, y: 38, size: 1.25, delay: 2.82 },
  { x: 16, y: 74, size: 1.0, delay: 2.93 },
  { x: 84, y: 74, size: 1.0, delay: 3.12 },
  { x: 31, y: 108, size: 1.2, delay: 3.26 },
  { x: 70, y: 110, size: 1.2, delay: 3.44 },
];

const dust = [
  [10, 16, 0.8],[18,26,0.7],[23,33,0.6],[30,18,0.5],[38,24,0.6],[48,14,0.5],[58,26,0.7],[66,18,0.55],[74,24,0.7],[83,14,0.5],
  [12,50,0.45],[22,58,0.55],[31,67,0.5],[43,58,0.65],[54,66,0.4],[61,50,0.5],[70,61,0.55],[80,55,0.4],
  [16,92,0.55],[27,104,0.5],[38,96,0.6],[49,104,0.55],[62,95,0.45],[72,107,0.6],[84,98,0.55],[55,36,0.35],[45,82,0.35],[52,122,0.42]
];

export default function NativeRealVsLaunch() {
  useEffect(() => {
    setNativeLaunchFullscreen(true);
    return () => setNativeLaunchFullscreen(false);
  }, []);

  return (
    <main className="app-loading app-loading--native velvet-real-vs-launch" aria-label="Velvet is opening">
      <div className="velvet-real-vs-launch__underlay" aria-hidden="true" />
      <svg className="velvet-real-vs-launch__svg" viewBox="0 0 100 160" role="presentation" aria-hidden="true">
        <defs>
          <radialGradient id="velvetBgGlow" cx="50%" cy="48%" r="60%">
            <stop offset="0%" stopColor="#2d061a" />
            <stop offset="55%" stopColor="#12020c" />
            <stop offset="100%" stopColor="#050103" />
          </radialGradient>
          <linearGradient id="velvetShardFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff8fd" />
            <stop offset="18%" stopColor="#ffd6ec" />
            <stop offset="42%" stopColor="#ff8fc5" />
            <stop offset="70%" stopColor="#8f314f" />
            <stop offset="100%" stopColor="#fff4fb" />
          </linearGradient>
          <linearGradient id="velvetShardInner" x1="0%" y1="10%" x2="100%" y2="90%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
            <stop offset="35%" stopColor="rgba(255,255,255,0.26)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <linearGradient id="velvetVsFill" x1="15%" y1="5%" x2="85%" y2="95%">
            <stop offset="0%" stopColor="#fff7fc" />
            <stop offset="18%" stopColor="#ffd9ee" />
            <stop offset="40%" stopColor="#ff9ccc" />
            <stop offset="72%" stopColor="#b4476e" />
            <stop offset="100%" stopColor="#fff8fe" />
          </linearGradient>
          <filter id="velvetVsGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.95" result="blur" />
            <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 0.6 0 0 0  0 0 0.82 0 0  0 0 0 1 0" result="pinkBlur" />
            <feMerge>
              <feMergeNode in="pinkBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="velvetSoftGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
          <filter id="velvetStarGlow" x="-200%" y="-200%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="0.45" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="velvetScreenClip"><rect x="0" y="0" width="100" height="160" rx="0" /></clipPath>
        </defs>

        <rect className="velvet-real-vs-launch__bg" x="0" y="0" width="100" height="160" fill="url(#velvetBgGlow)" />
        <ellipse className="velvet-real-vs-launch__core-glow" cx="50" cy="78" rx="28" ry="34" fill="#ae285d" opacity="0.22" filter="url(#velvetSoftGlow)" />
        <ellipse className="velvet-real-vs-launch__core-glow velvet-real-vs-launch__core-glow--small" cx="50" cy="81" rx="20" ry="24" fill="#ff8cc6" opacity="0.16" filter="url(#velvetSoftGlow)" />

        <g className="velvet-real-vs-launch__dust" clipPath="url(#velvetScreenClip)">
          {dust.map(([cx, cy, r], index) => (
            <circle key={index} className="velvet-real-vs-launch__dust-dot" cx={cx} cy={cy} r={r} />
          ))}
        </g>

        <g className="velvet-real-vs-launch__shards" clipPath="url(#velvetScreenClip)">
          {shards.map((shard, index) => (
            <g
              key={index}
              className="velvet-real-vs-launch__shard"
              style={{
                "--tx": shard.tx,
                "--ty": shard.ty,
                "--rot": `${shard.rot}deg`,
                "--ox": shard.ox,
                "--oy": shard.oy,
                "--or": `${shard.or}deg`,
                "--delay": `${shard.delay}s`,
              }}
            >
              <polygon points={shard.points} className="velvet-real-vs-launch__shard-fill" />
              <polygon points={shard.points} className="velvet-real-vs-launch__shard-line" />
            </g>
          ))}
        </g>

        <g className="velvet-real-vs-launch__vs-group">
          <text x="50" y="92" textAnchor="middle" className="velvet-real-vs-launch__vs velvet-real-vs-launch__vs--glow">VS</text>
          <text x="50" y="92" textAnchor="middle" className="velvet-real-vs-launch__vs">VS</text>
        </g>

        <rect className="velvet-real-vs-launch__sheen" x="-26" y="18" width="15" height="130" rx="6" />

        <g className="velvet-real-vs-launch__sparkles">
          {sparkles.map((spark, index) => (
            <g key={index} className="velvet-real-vs-launch__sparkle" style={{ "--delay": `${spark.delay}s` }} transform={`translate(${spark.x} ${spark.y}) scale(${spark.size})`}>
              <path d="M0 -1.8 L0.42 -0.42 L1.8 0 L0.42 0.42 L0 1.8 L-0.42 0.42 L-1.8 0 L-0.42 -0.42 Z" filter="url(#velvetStarGlow)" />
            </g>
          ))}
        </g>

        <g className="velvet-real-vs-launch__progress">
          <line x1="37" y1="151" x2="63" y2="151" className="velvet-real-vs-launch__progress-line" />
          <circle cx="37" cy="151" r="1.15" className="velvet-real-vs-launch__progress-glint" />
        </g>

        <circle className="velvet-real-vs-launch__flash" cx="50" cy="80" r="1.2" />
      </svg>
    </main>
  );
}
