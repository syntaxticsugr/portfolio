import { useEffect, useRef, useState } from "react";

type Theme = "light" | "dark";
const storageKey = "syntaxticsugr.theme";

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(storageKey);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export default function useTheme() {
  const [theme, setTheme] = useState<Theme>(
    () =>
      storedTheme() ??
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
  );
  const chosen = useRef(storedTheme() !== null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#151619" : "#eeece5");
  }, [theme]);

  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const change = () => {
      if (!chosen.current) setTheme(media.matches ? "dark" : "light");
    };
    const storage = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      chosen.current = event.newValue === "light" || event.newValue === "dark";
      setTheme(storedTheme() ?? (media.matches ? "dark" : "light"));
    };
    media.addEventListener("change", change);
    addEventListener("storage", storage);
    return () => {
      media.removeEventListener("change", change);
      removeEventListener("storage", storage);
    };
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    chosen.current = true;
    setTheme(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      /* The theme still works when storage is unavailable. */
    }
  };
  return { theme, toggleTheme };
}
