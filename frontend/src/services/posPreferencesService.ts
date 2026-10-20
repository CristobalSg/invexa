export interface PosShortcuts {
  cart: string;
  checkout: string;
}

export const DEFAULT_POS_SHORTCUTS: PosShortcuts = {
  cart: "\\",
  checkout: "[",
};

export const POS_SHORTCUTS_CHANGED_EVENT = "invexa:pos-shortcuts-changed";

const SHORTCUTS_KEY = "pos_keyboard_shortcuts";
const FAVORITES_KEY = "pos_favorite_product_ids";
const LEGACY_FAVORITES_KEY = "pos-featured-products";

export const isAllowedPosShortcut = (value: unknown): value is string =>
  typeof value === "string" && (
    (value.length === 1 && !/[\p{L}\p{N}\s]/u.test(value)) ||
    /^F(?:[1-9]|1[0-2])$/.test(value)
  );

export function getStoredPosShortcuts(): PosShortcuts {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SHORTCUTS_KEY) ?? "null");
    if (
      parsed &&
      typeof parsed === "object" &&
      "cart" in parsed &&
      "checkout" in parsed &&
      isAllowedPosShortcut(parsed.cart) &&
      isAllowedPosShortcut(parsed.checkout) &&
      parsed.cart !== parsed.checkout
    ) {
      return { cart: parsed.cart, checkout: parsed.checkout };
    }
  } catch {
    // Usa los valores predeterminados cuando la preferencia guardada no es valida.
  }

  return DEFAULT_POS_SHORTCUTS;
}

export function setStoredPosShortcuts(shortcuts: PosShortcuts) {
  localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(shortcuts));
  window.dispatchEvent(new CustomEvent<PosShortcuts>(POS_SHORTCUTS_CHANGED_EVENT, { detail: shortcuts }));
}

export function getStoredFavoriteProductIds(): number[] {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    const legacyStored = sessionStorage.getItem(LEGACY_FAVORITES_KEY);
    const parsed: unknown = JSON.parse(stored ?? legacyStored ?? "[]");
    if (!Array.isArray(parsed)) return [];
    const ids = Array.from(new Set(parsed.filter((id): id is number => Number.isInteger(id) && id > 0)));
    if (!stored && ids.length > 0) localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
    return ids;
  } catch {
    return [];
  }
}

export function setStoredFavoriteProductIds(ids: number[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(new Set(ids))));
}
