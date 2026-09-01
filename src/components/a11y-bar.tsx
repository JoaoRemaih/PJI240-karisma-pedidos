import { useEffect, useId, useRef, useState } from "react";
import { Accessibility, X } from "lucide-react";
import {
  A11Y_DEFAULT,
  applyA11y,
  nextFont,
  readA11y,
  writeA11y,
  type A11yState,
} from "@/lib/a11y";
import { cn } from "@/lib/utils";

const OPEN_EVENT = "karisma-a11y-open";

export function openA11yPanel() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_EVENT));
}

function persist(next: A11yState) {
  applyA11y(next);
  writeA11y(next);
  return next;
}

export function A11yMenu() {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<A11yState>(A11Y_DEFAULT);
  const [libras, setLibras] = useState(false);

  useEffect(() => {
    const current = readA11y();
    setState(current);
    applyA11y(current);
  }, []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="a11y-fab print:hidden">
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Opções de acessibilidade"
          className="a11y-panel"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="font-display text-sm font-semibold text-navy">Acessibilidade</p>
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-sm text-navy hover:bg-mist"
              aria-label="Fechar"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="grid gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Texto</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="a11y-opt"
                disabled={state.font === 1}
                onClick={() => setState((s) => persist({ ...s, font: nextFont(s.font, -1) }))}
              >
                A−
              </button>
              <button
                type="button"
                className="a11y-opt"
                disabled={state.font === 3}
                onClick={() => setState((s) => persist({ ...s, font: nextFont(s.font, 1) }))}
              >
                A+
              </button>
            </div>
            <button
              type="button"
              className={cn("a11y-opt w-full justify-start", state.contrast === "alto" && "a11y-opt-on")}
              aria-pressed={state.contrast === "alto"}
              onClick={() =>
                setState((s) =>
                  persist({ ...s, contrast: s.contrast === "alto" ? "padrao" : "alto" }),
                )
              }
            >
              Alto contraste
            </button>
            <button
              type="button"
              className={cn("a11y-opt w-full justify-start", state.links === "underline" && "a11y-opt-on")}
              aria-pressed={state.links === "underline"}
              onClick={() =>
                setState((s) =>
                  persist({ ...s, links: s.links === "underline" ? "padrao" : "underline" }),
                )
              }
            >
              Sublinhar links
            </button>
            <button
              type="button"
              className={cn("a11y-opt w-full justify-start", libras && "a11y-opt-on")}
              aria-pressed={libras}
              onClick={() => {
                setLibras(true);
                loadVLibras();
              }}
            >
              Traduzir em Libras
            </button>
            <button
              type="button"
              className="a11y-opt w-full justify-start"
              onClick={() => setState(persist({ ...A11Y_DEFAULT }))}
            >
              Restaurar
            </button>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        className="a11y-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? "Fechar acessibilidade" : "Abrir acessibilidade"}
        onClick={() => setOpen((v) => !v)}
      >
        <Accessibility className="size-5" aria-hidden />
      </button>
    </div>
  );
}

declare global {
  interface Window {
    VLibras?: { Widget: new (url: string) => unknown };
  }
}

function loadVLibras() {
  if (typeof document === "undefined") return;
  if (document.querySelector("[vw]")) return;
  const host = document.createElement("div");
  host.setAttribute("vw", "");
  host.className = "enabled";
  host.innerHTML =
    '<div vw-access-button class="active"></div><div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>';
  document.body.appendChild(host);
  const script = document.createElement("script");
  script.src = "https://vlibras.gov.br/app/vlibras-plugin.js";
  script.async = true;
  script.onload = () => {
    try {
      if (window.VLibras) new window.VLibras.Widget("https://vlibras.gov.br/app");
    } catch {
      /* widget opcional */
    }
  };
  document.body.appendChild(script);
}
