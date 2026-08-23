export type ThemeMode = "dark" | "light";

const THEME_KEY = "theme_mode";
const SHOW_CURSOR_KEY = "show_mouse_cursor";

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

export function getStoredShowCursor(): boolean {
  return localStorage.getItem(SHOW_CURSOR_KEY) === "true";
}

export function applyCursorPreference(showCursor: boolean) {
  document.documentElement.classList.toggle("hide-cursor", !showCursor);
  document.documentElement.dataset.cursor = showCursor ? "visible" : "hidden";
}

export function setStoredShowCursor(showCursor: boolean) {
  localStorage.setItem(SHOW_CURSOR_KEY, String(showCursor));
  applyCursorPreference(showCursor);
}
