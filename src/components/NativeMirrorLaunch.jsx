import { useEffect } from "react";
import { setNativeLaunchFullscreen } from "../native/velvetNative";

const fragments = [
  { clip:"polygon(0 0,100% 10%,78% 100%,8% 76%)", x:"-52vw", y:"-26vh", r:"-62deg", d:".04s", w:"27%", h:"26%", l:"8%", t:"7%" },
  { clip:"polygon(12% 0,100% 0,82% 86%,0 100%)", x:"48vw", y:"-32vh", r:"51deg", d:".12s", w:"24%", h:"31%", l:"39%", t:"3%" },
  { clip:"polygon(0 12%,92% 0,100% 100%,18% 80%)", x:"56vw", y:"-4vh", r:"89deg", d:".20s", w:"25%", h:"28%", l:"67%", t:"14%" },
  { clip:"polygon(4% 0,100% 16%,72% 100%,0 84%)", x:"-58vw", y:"5vh", r:"-97deg", d:".10s", w:"28%", h:"29%", l:"1%", t:"34%" },
  { clip:"polygon(20% 0,100% 15%,86% 100%,0 80%)", x:"42vw", y:"8vh", r:"73deg", d:".28s", w:"25%", h:"27%", l:"71%", t:"40%" },
  { clip:"polygon(0 8%,85% 0,100% 91%,16% 100%)", x:"-50vw", y:"39vh", r:"-41deg", d:".22s", w:"28%", h:"27%", l:"9%", t:"66%" },
  { clip:"polygon(8% 0,100% 20%,88% 100%,0 74%)", x:"14vw", y:"51vh", r:"34deg", d:".34s", w:"26%", h:"28%", l:"40%", t:"69%" },
  { clip:"polygon(0 20%,88% 0,100% 84%,24% 100%)", x:"55vw", y:"44vh", r:"101deg", d:".17s", w:"25%", h:"28%", l:"67%", t:"65%" },
  { clip:"polygon(0 0,100% 18%,70% 100%,10% 82%)", x:"-36vw", y:"-2vh", r:"-132deg", d:".38s", w:"20%", h:"21%", l:"28%", t:"28%" },
  { clip:"polygon(18% 0,100% 10%,86% 100%,0 76%)", x:"35vw", y:"-12vh", r:"118deg", d:".31s", w:"20%", h:"22%", l:"51%", t:"26%" },
  { clip:"polygon(0 10%,90% 0,100% 100%,14% 82%)", x:"-34vw", y:"20vh", r:"-74deg", d:".42s", w:"21%", h:"22%", l:"28%", t:"50%" },
  { clip:"polygon(12% 0,100% 18%,84% 100%,0 76%)", x:"38vw", y:"24vh", r:"66deg", d:".46s", w:"21%", h:"22%", l:"51%", t:"51%" },
];

export default function NativeMirrorLaunch() {
  useEffect(() => {
    setNativeLaunchFullscreen(true);
    return () => { setNativeLaunchFullscreen(false); };
  }, []);

  return (
    <main className="app-loading app-loading--native velvet-mirror" aria-label="Velvet is opening">
      <div className="velvet-mirror__ambient" aria-hidden="true"><i/><i/><i/></div>

      <div className="velvet-mirror__stage" aria-hidden="true">
        <div className="velvet-mirror__halo" />
        <div className="velvet-mirror__fragments">
          {fragments.map((f, index) => (
            <i
              key={index}
              className={`velvet-mirror__shard velvet-mirror__shard--${index + 1}`}
              style={{
                "--clip": f.clip,
                "--x": f.x,
                "--y": f.y,
                "--r": f.r,
                "--delay": f.d,
                "--w": f.w,
                "--h": f.h,
                "--l": f.l,
                "--t": f.t,
              }}
            />
          ))}
        </div>

        <div className="velvet-mirror__monogram">
          <span>V</span><span>S</span>
        </div>
        <div className="velvet-mirror__sweep" />
        <div className="velvet-mirror__crack velvet-mirror__crack--a" />
        <div className="velvet-mirror__crack velvet-mirror__crack--b" />
      </div>

      <div className="velvet-mirror__progress" aria-hidden="true">
        <i/><i/><i/><i/><i/>
      </div>
      <div className="velvet-mirror__exit-flash" aria-hidden="true" />
    </main>
  );
}
