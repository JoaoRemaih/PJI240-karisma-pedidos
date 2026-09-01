import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { openA11yPanel } from "@/components/a11y-bar";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

const LINKS = [
  { href: "#empresas", label: "Empresas" },
  { href: "#escolas", label: "Escolas" },
  { href: "#eventos", label: "Eventos e Esportivo" },
  { href: "#contato", label: "Contato" },
];

function AuthAction() {
  const { user } = useCurrentUserState();
  if (user) {
    return (
      <Link
        to="/painel"
        className="inline-flex min-h-11 min-w-[5.5rem] items-center justify-center rounded-sm bg-lime px-4 text-sm font-bold uppercase tracking-wide text-ink hover:bg-lime-hover"
      >
        Painel
      </Link>
    );
  }
  return (
    <Link
      to="/login"
      className="inline-flex min-h-11 min-w-[5.5rem] items-center justify-center rounded-sm border-2 border-navy px-4 text-sm font-semibold text-navy hover:bg-navy hover:text-paper"
    >
      Entrar
    </Link>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper">
      <a href="#conteudo" className="skip-link">
        Ir para o conteúdo
      </a>
      <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between gap-2 px-3 sm:px-5">
        <Link to="/" className="min-w-0 shrink" aria-label="Karisma Uniformes — início">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-6 md:flex" aria-label="Seções">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-ink hover:text-navy"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <AuthAction />
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center text-navy md:hidden"
            aria-expanded={open}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open ? (
        <nav className="border-t border-line px-5 py-3 md:hidden" aria-label="Seções">
          <ul className="flex flex-col">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="flex min-h-11 items-center text-ink"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-navy-deep py-10 text-center text-paper">
      <div className="mx-auto max-w-[1100px] px-5">
        <img
          src="/brand/logo.png"
          alt="Karisma Uniformes"
          className="mx-auto mb-4 h-12 w-auto brightness-0 invert"
        />
        <p className="font-display font-semibold">Karisma Uniformes</p>
        <p className="mt-1 text-sm text-paper/80">
          Av. Cel. Junqueira, 400 — Novo Horizonte, SP, 14960-000
        </p>
        <p className="text-sm text-paper/80">
          Telefone:{" "}
          <a className="underline" href="tel:+5517992021743">
            (17) 99202-1743
          </a>{" "}
          · E-mail:{" "}
          <a className="underline" href="mailto:contato@karismauniformes.com.br">
            contato@karismauniformes.com.br
          </a>
        </p>
        <p className="mt-4 text-xs text-paper/60">
          © {new Date().getFullYear()} Karisma Uniformes. Novo Horizonte — SP.
          <button
            type="button"
            className="ml-2 text-paper/40 hover:text-paper/80"
            onClick={() => openA11yPanel()}
          >
            Acessibilidade
          </button>
          <Link
            to="/login"
            className="ml-2 text-paper/40 no-underline hover:text-paper/80"
          >
            Equipe
          </Link>
        </p>
      </div>
    </footer>
  );
}
