import { useEffect } from "react";
import { setNativeLaunchFullscreen } from "../native/velvetNative";

const fragments = [
  { clip:"polygon(0 0,35% 0,28% 27%,0 37%)", dx:"-28vw", dy:"-22vh", r:"-13deg", d:".02s", ox:"-20vw", oy:"-16vh", or:"-16deg" },
  { clip:"polygon(35% 0,67% 0,61% 22%,49% 35%,28% 27%)", dx:"4vw", dy:"-34vh", r:"9deg", d:".10s", ox:"3vw", oy:"-24vh", or:"11deg" },
  { clip:"polygon(67% 0,100% 0,100% 38%,76% 29%,61% 22%)", dx:"30vw", dy:"-24vh", r:"14deg", d:".05s", ox:"24vw", oy:"-18vh", or:"17deg" },
  { clip:"polygon(0 37%,28% 27%,38% 48%,23% 62%,0 57%)", dx:"-38vw", dy:"-3vh", r:"-17deg", d:".16s", ox:"-31vw", oy:"-3vh", or:"-21deg" },
  { clip:"polygon(28% 27%,49% 35%,50% 55%,38% 48%)", dx:"-10vw", dy:"-10vh", r:"7deg", d:".22s", ox:"-14vw", oy:"-8vh", or:"9deg" },
  { clip:"polygon(49% 35%,61% 22%,76% 29%,71% 52%,50% 55%)", dx:"13vw", dy:"-7vh", r:"-8deg", d:".28s", ox:"16vw", oy:"-6vh", or:"-11deg" },
  { clip:"polygon(76% 29%,100% 38%,100% 60%,76% 65%,71% 52%)", dx:"36vw", dy:"-1vh", r:"16deg", d:".13s", ox:"29vw", oy:"1vh", or:"19deg" },
  { clip:"polygon(0 57%,23% 62%,31% 79%,0 86%)", dx:"-32vw", dy:"18vh", r:"-12deg", d:".34s", ox:"-27vw", oy:"15vh", or:"-15deg" },
  { clip:"polygon(23% 62%,38% 48%,50% 55%,48% 76%,31% 79%)", dx:"-13vw", dy:"16vh", r:"11deg", d:".40s", ox:"-15vw", oy:"13vh", or:"14deg" },
  { clip:"polygon(50% 55%,71% 52%,76% 65%,67% 82%,48% 76%)", dx:"13vw", dy:"14vh", r:"-10deg", d:".36s", ox:"16vw", oy:"13vh", or:"-13deg" },
  { clip:"polygon(76% 65%,100% 60%,100% 86%,72% 78%,67% 82%)", dx:"34vw", dy:"16vh", r:"13deg", d:".30s", ox:"28vw", oy:"14vh", or:"17deg" },
  { clip:"polygon(0 86%,31% 79%,42% 100%,0 100%)", dx:"-25vw", dy:"34vh", r:"-15deg", d:".46s", ox:"-21vw", oy:"28vh", or:"-18deg" },
  { clip:"polygon(31% 79%,48% 76%,67% 82%,58% 100%,42% 100%)", dx:"0vw", dy:"39vh", r:"8deg", d:".50s", ox:"0vw", oy:"31vh", or:"10deg" },
  { clip:"polygon(67% 82%,72% 78%,100% 86%,100% 100%,58% 100%)", dx:"26vw", dy:"34vh", r:"14deg", d:".43s", ox:"22vw", oy:"27vh", or:"18deg" },
];

const sparks = [
  [12,13,.1],[84,17,.7],[23,45,1.2],[72,39,.35],[17,69,.9],[82,72,1.5],[53,20,1.8],[48,63,.55]
];

export default function NativeCrystalLaunch() {
  useEffect(() => {
    setNativeLaunchFullscreen(true);
    return () => setNativeLaunchFullscreen(false);
  }, []);

  return (
    <main className="app-loading app-loading--native velvet-crystal-launch" aria-label="Velvet is opening">
      <div className="velvet-crystal-launch__base" aria-hidden="true" />
      <div className="velvet-crystal-launch__scene" aria-hidden="true">
        <div className="velvet-crystal-launch__fragments">
          {fragments.map((fragment, index) => (
            <i
              key={index}
              className="velvet-crystal-launch__fragment"
              style={{
                "--clip": fragment.clip,
                "--dx": fragment.dx,
                "--dy": fragment.dy,
                "--r": fragment.r,
                "--d": fragment.d,
                "--ox": fragment.ox,
                "--oy": fragment.oy,
                "--or": fragment.or,
              }}
            />
          ))}
        </div>
        <div className="velvet-crystal-launch__hero" />
        <div className="velvet-crystal-launch__sheen" />
        <div className="velvet-crystal-launch__halo" />
        {sparks.map(([x,y,d], index) => (
          <b key={index} className="velvet-crystal-launch__spark" style={{"--x":`${x}%`,"--y":`${y}%`,"--sd":`${d}s`}}>✦</b>
        ))}
        <div className="velvet-crystal-launch__progress-glint" />
      </div>
      <div className="velvet-crystal-launch__flash" aria-hidden="true" />
    </main>
  );
}
