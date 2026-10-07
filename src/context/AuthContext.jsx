import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const applySession = (nextSession) => {
      if (!mounted) return;
      setSession(nextSession || null);
      setUser(nextSession?.user || null);
      setAuthLoading(false);
    };
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) throw error;
      applySession(data?.session || null);
    }).catch((error) => {
      console.error("Velvet session restore failed:", error);
      applySession(null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => applySession(nextSession));
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: String(email || "").trim(), password });
    if (error) throw error;
    return data;
  }

  async function signUp({ email, password }) {
    const { data, error } = await supabase.auth.signUp({ email: String(email || "").trim(), password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  return <AuthContext.Provider value={{ session, user, authLoading, privateMode: false, signIn, signUp, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
