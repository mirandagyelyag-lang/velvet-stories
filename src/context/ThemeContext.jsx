import { createContext, useContext, useEffect, useState } from "react";
import { syncNativeChrome } from "../native/velvetNative";

const ThemeContext = createContext();
const THEMES = ["dark", "comfort"];

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = sessionStorage.getItem("orvayne-selected-theme") || localStorage.getItem("velvet-theme");
      return THEMES.includes(saved) ? saved : "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("velvet-theme", theme); sessionStorage.setItem("orvayne-selected-theme", theme); } catch {}
    syncNativeChrome(theme);
  }, [theme]);

  function setTheme(nextTheme) {
    if (THEMES.includes(nextTheme)) { try { sessionStorage.setItem("orvayne-selected-theme", nextTheme); localStorage.setItem("velvet-theme", nextTheme); } catch {} setThemeState(nextTheme); }
  }

  function toggleTheme() {
    setThemeState((current) => THEMES[(THEMES.indexOf(current) + 1) % THEMES.length]);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme debe utilizarse dentro de ThemeProvider");
  return context;
}
