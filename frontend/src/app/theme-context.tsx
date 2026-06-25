"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("cs_theme") as Theme | null;
    if (stored === "light") {
      setThemeState("light");
    } else {
      setThemeState("dark");
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    const body = document.body;

    // Toggle Tailwind dark class on html
    root.classList.toggle("dark", theme === "dark");

    // Directly set body style for background
    if (theme === "dark") {
      body.style.background =
        "linear-gradient(160deg, #0a0a1a 0%, #12102a 20%, #1a0a30 40%, #162040 60%, #0f1a3a 80%, #0a0a1a 100%)";
      body.style.color = "#e8e8ed";
    } else {
      body.style.background = "#faf8f7";
      body.style.color = "#252124";
    }

    localStorage.setItem("cs_theme", theme);
  }, [theme, mounted]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
