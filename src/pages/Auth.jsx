import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const { theme, setTheme } = useTheme();
  const frame = useRef(null);
  const [error, setError] = useState("");
  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: "velvet-theme-sync", theme }, window.location.origin);
  }, [theme]);
  useEffect(() => {
    const handle = async (event) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === "velvet-theme-ready") {
        frame.current?.contentWindow?.postMessage({ type: "velvet-theme-sync", theme }, window.location.origin);
        return;
      }
      if (event.data?.type === "velvet-theme-select") {
        if (["dark", "light", "comfort"].includes(event.data.theme)) setTheme(event.data.theme);
        return;
      }
      if (event.data?.type !== "velvet-auth-submit") return;
      const { mode, email, password } = event.data;
      try {
        if (mode === "signup") {
          const result = await signUp({ email, password });
          if (!result?.session) {
            frame.current?.contentWindow?.postMessage({type:"velvet-auth-result",ok:false,message:"Tu cuenta está creada. Revisa tu correo para confirmarla; luego inicia sesión."},window.location.origin);
            return;
          }
        } else {
          await signIn({ email, password });
        }
        try { sessionStorage.setItem("velvet-user-supplied-entry-v1", "1"); } catch {}
        frame.current?.contentWindow?.postMessage({type:"velvet-auth-result",ok:true},window.location.origin);
      } catch (err) {
        const message = /invalid login credentials/i.test(err?.message || "") ? "Ese correo o contraseña no coincide." : (err?.message || "No pude abrir tu sesión.");
        setError(message);
        frame.current?.contentWindow?.postMessage({type:"velvet-auth-result",ok:false,message},window.location.origin);
      }
    };
    window.addEventListener("message",handle);
    return () => window.removeEventListener("message",handle);
  }, [signIn,signUp,theme,setTheme]);
  return <main style={{position:"fixed",inset:0,background:"#100810",zIndex:100,overflow:"hidden"}}>
    <iframe ref={frame} src="/velvet-reference-auth.html" title="Velvet Stories: entrada y registro" style={{width:"100%",height:"100%",border:0,display:"block"}} />
    {error && <span role="status" style={{position:"absolute",width:1,height:1,overflow:"hidden"}}>{error}</span>}
  </main>;
}
