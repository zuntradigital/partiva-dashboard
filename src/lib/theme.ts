"use client";

import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "partiva_theme";

// Mirrors the inline anti-flash script in layout.tsx -- keep both in sync.
function applyTheme(theme: Theme) {
  if (theme === "light") document.documentElement.setAttribute("data-theme", "light");
  else document.documentElement.removeAttribute("data-theme");
  window.localStorage.setItem(STORAGE_KEY, theme);
}

export function useTheme() {
  // Always starts as "dark" to match the server-rendered markup exactly --
  // the inline script in layout.tsx already applied the real theme to the
  // DOM before hydration, so this effect just reads it back into React state
  // afterwards instead of guessing during render (which would risk a
  // hydration mismatch if it guessed differently from the server).
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");
  }, []);

  const setThemeAndPersist = useCallback((next: Theme) => {
    applyTheme(next);
    setTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeAndPersist(theme === "light" ? "dark" : "light");
  }, [theme, setThemeAndPersist]);

  return { theme, setTheme: setThemeAndPersist, toggleTheme };
}
