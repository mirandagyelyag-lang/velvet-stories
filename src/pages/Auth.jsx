import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";
import { useTheme } from "../context/ThemeContext";
import IdentidadViva from "../components/IdentidadViva/IdentidadViva";
import CinematicEntry from "../components/CinematicEntry";

export default function Auth() {
  const { signIn, signUp, signInWithProvider } = useAuth();
  const { theme, setTheme } = useTheme();
  const lightEntry = theme === "light";
  const comfortEntry = theme === "comfort";
  const [entered, setEntered] = useState(false);
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");


  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      if (mode === "signup") {
        const result = await signUp({ email, password });
        if (!result?.session) setMessage("Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.");
      } else {
        await signIn({ email, password });
      }
      try { sessionStorage.setItem("velvet-user-supplied-entry-v1", "1"); } catch {}
    } catch (error) {
      setMessage(/invalid login credentials/i.test(error?.message || "") ? "Correo o contraseña incorrectos." : (error?.message || "No se pudo iniciar sesión."));
    } finally { setBusy(false); }
  }

  async function resetPassword() {
    if (!email.trim()) { setMessage("Escribe tu correo primero para recuperar tu contraseña."); return; }
    setBusy(true); setMessage("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
      if (error) throw error;
      setMessage("Si existe una cuenta con ese correo, recibirás un enlace para recuperar tu contraseña.");
    } catch (error) { setMessage(error?.message || "No se pudo enviar el correo."); }
    finally { setBusy(false); }
  }

  return <main className={`velvet-gold-auth${lightEntry ? " orvayne-auth--light" : comfortEntry ? " orvayne-auth--comfort" : ""}`}>
    <style>{`.velvet-gold-auth{position:fixed;inset:0;z-index:100;overflow:hidden;background:#100716}.velvet-gold-auth.orvayne-auth--light{background:#f7f0ed}.velvet-gold-auth.orvayne-auth--comfort{background:#e5f2fc}.velvet-gold-auth .entry-scene{position:absolute;inset:0;width:100%;height:100%;border:0;display:block}`}</style>
    <CinematicEntry theme={theme} onTheme={setTheme} onEnter={() => setEntered(true)} entered={entered}>
    <IdentidadViva open={entered} theme={theme} onBack={() => setEntered(false)} onSignIn={signIn} onSignUp={signUp} onSocialSignIn={signInWithProvider} onResetPassword={async address => {const {error}=await supabase.auth.resetPasswordForEmail(address,{redirectTo:window.location.origin});if(error)throw error;}} />
    </CinematicEntry>
  </main>;
}
