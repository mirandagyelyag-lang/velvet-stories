import { useEffect } from "react";
import { setNativeLaunchFullscreen } from "../native/velvetNative";

export default function NativeCrystalLaunch() {
  useEffect(() => {
    setNativeLaunchFullscreen(true);
    return () => setNativeLaunchFullscreen(false);
  }, []);

  return (
    <main className="app-loading app-loading--native velvet-crystal-launch" aria-label="Velvet is opening">
      <div className="velvet-crystal-launch__base" aria-hidden="true" />
      <div className="velvet-crystal-launch__glow" aria-hidden="true" />
      <div className="velvet-crystal-launch__sheen" aria-hidden="true" />
    </main>
  );
}
