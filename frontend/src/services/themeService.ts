export type ThemeMode = "dark" | "light";

const THEME_KEY = "theme_mode";

export function getStoredTheme(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === "light" ? "light" : "dark";
}

export function applyTheme(theme: ThemeMode) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
}

export function setStoredTheme(theme: ThemeMode) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}
