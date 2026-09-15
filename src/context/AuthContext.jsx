import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { supabase } from "../services/supabase";

const AuthContext = createContext(null);
const DEFAULT_OWNER_EMAIL = "mirandagyelyag@gmail.com";

function normalizedEmail(value = "") {
  return String(value || "").trim().toLowerCase();
}

function getOwnerEmail() {
  return normalizedEmail(import.meta.env.VITE_VELVET_OWNER_EMAIL || DEFAULT_OWNER_EMAIL);
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const ownerEmail = useMemo(() => getOwnerEmail(), []);

  useEffect(() => {
    let mounted = true;

    try {
      window.localStorage.removeItem("velvet-private-session-v1");
      window.localStorage.removeItem("velvet-private-email-v1");
    } catch {
      // Storage can be unavailable in hardened/private browser contexts.
    }

    const applySession = (nextSession) => {
      if (!mounted) return;

      const nextEmail = normalizedEmail(nextSession?.user?.email);
      const isOwner = Boolean(nextSession?.user) && nextEmail === ownerEmail;

      if (nextSession?.user && !isOwner) {
        setSession(null);
        setUser(null);
        setAuthLoading(false);
        supabase.auth.signOut().catch((error) => {
          console.error("Velvet rejected a non-owner session:", error);
        });
        return;
      }

      setSession(isOwner ? nextSession : null);
      setUser(isOwner ? nextSession.user : null);
      setAuthLoading(false);
    };

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        applySession(data?.session || null);
      })
      .catch((error) => {
        console.error("Velvet session restore failed:", error);
        applySession(null);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [ownerEmail]);

  async function signIn({ email, password }) {
    const requestedEmail = normalizedEmail(email);
    if (requestedEmail !== ownerEmail) {
      throw new Error("Private owner account required");
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: ownerEmail,
      password,
    });
    if (error) throw error;

    if (normalizedEmail(data?.user?.email) !== ownerEmail) {
      await supabase.auth.signOut();
      throw new Error("Private owner account required");
    }

    return data;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  return (
    <AuthContext.Provider value={{ session, user, authLoading, privateMode: true, ownerEmail, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
