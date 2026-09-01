export type A11yContrast = "padrao" | "alto";
export type A11yLinks = "padrao" | "underline";
export type A11yFont = 1 | 2 | 3;

export type A11yState = {
  contrast: A11yContrast;
  font: A11yFont;
  links: A11yLinks;
};

export const A11Y_STORAGE_KEY = "karisma-a11y";

export const A11Y_DEFAULT: A11yState = {
  contrast: "padrao",
  font: 1,
  links: "padrao",
};

export function nextFont(current: A11yFont, delta: -1 | 1): A11yFont {
  const next = current + delta;
  if (next < 1) return 1;
  if (next > 3) return 3;
  return next as A11yFont;
}

export function parseA11y(raw: unknown): A11yState {
  if (!raw || typeof raw !== "object") return { ...A11Y_DEFAULT };
  const rec = raw as Record<string, unknown>;
  const contrast: A11yContrast = rec.contrast === "alto" ? "alto" : "padrao";
  const links: A11yLinks = rec.links === "underline" ? "underline" : "padrao";
  const fontNum = Number(rec.font);
  const font: A11yFont = fontNum === 2 || fontNum === 3 ? fontNum : 1;
  return { contrast, font, links };
}

export function readA11y(): A11yState {
  if (typeof window === "undefined") return { ...A11Y_DEFAULT };
  try {
    const raw = window.localStorage.getItem(A11Y_STORAGE_KEY);
    return parseA11y(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...A11Y_DEFAULT };
  }
}

export function writeA11y(state: A11yState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

export function applyA11y(state: A11yState): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.a11yContrast = state.contrast;
  root.dataset.a11yFont = String(state.font);
  root.dataset.a11yLinks = state.links;
}

export const A11Y_BOOT_SCRIPT = `try{var s=JSON.parse(localStorage.getItem("${A11Y_STORAGE_KEY}")||"{}");var h=document.documentElement;if(s.contrast==="alto")h.setAttribute("data-a11y-contrast","alto");if(s.font==2||s.font==3)h.setAttribute("data-a11y-font",String(s.font));if(s.links==="underline")h.setAttribute("data-a11y-links","underline");}catch(e){}`;
