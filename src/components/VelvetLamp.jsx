import "./VelvetLamp.css";

// Dependency-free Velvet adaptation of Aceternity's lamp visual motif.
export default function VelvetLamp() {
  return <div className="velvet-lamp" aria-hidden="true">
    <div className="velvet-lamp__beam velvet-lamp__beam--left" />
    <div className="velvet-lamp__beam velvet-lamp__beam--right" />
    <div className="velvet-lamp__halo" />
    <div className="velvet-lamp__line" />
    <div className="velvet-lamp__bloom" />
  </div>;
}
