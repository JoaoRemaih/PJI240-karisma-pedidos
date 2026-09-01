import { useEffect, useState } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Plus,
  Scissors,
  Shield,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { authClient, signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { canAccess, type AppPage } from "@/lib/karisma/roles";
import { Logo } from "@/components/logo";
import { JUST_IN_KEY } from "@/components/staff-login";
import { PendingAccess, RoleTag, StaffProvider, useStaff } from "@/components/staff-session";

const NAV: { page: AppPage; to: string; label: string; icon: typeof Menu }[] = [
  { page: "painel", to: "/painel", label: "Painel", icon: LayoutDashboard },
  { page: "clientes", to: "/clientes", label: "Clientes", icon: Users },
  { page: "pedidos-novo", to: "/pedidos/novo", label: "Novo pedido", icon: Plus },
  { page: "pedidos", to: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { page: "producao", to: "/producao", label: "Produção", icon: Scissors },
  { page: "estoque", to: "/estoque", label: "Estoque", icon: Warehouse },
  { page: "catalogo", to: "/catalogo", label: "Catálogo", icon: BookOpen },
  { page: "relatorios", to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { page: "equipe", to: "/equipe", label: "Equipe", icon: Shield },
];

export function AppShell() {
  const { user, isPending } = useCurrentUserState();
  const [justIn, setJustIn] = useState(() => {
    try {
      return sessionStorage.getItem(JUST_IN_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (user) {
      try {
        sessionStorage.removeItem(JUST_IN_KEY);
      } catch {
        /* ignore */
      }
      setJustIn(false);
      return;
    }
    if (isPending || !justIn) return;
    let cancelled = false;
    const started = Date.now();
    void (async () => {
      while (!cancelled && Date.now() - started < 2500) {
        try {
          const { data } = await authClient.getSession();
          if (data?.user) return;
        } catch {
          /* retry */
        }
        await new Promise((r) => window.setTimeout(r, 200));
      }
      if (!cancelled) {
        try {
          sessionStorage.removeItem(JUST_IN_KEY);
        } catch {
          /* ignore */
        }
        setJustIn(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isPending, justIn]);

  if (isPending || justIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mist text-muted">
        Carregando sessão…
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return (
    <StaffProvider>
      <AuthedFrame />
    </StaffProvider>
  );
}

function AuthedFrame() {
  const { status, staff, pending } = useStaff();
  if (pending || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mist text-muted">
        Carregando equipe…
      </div>
    );
  }
  if (status === "pending" || !staff) return <PendingAccess />;
  return (
    <div className="min-h-screen overflow-x-hidden bg-mist">
      <AppHeader />
      <Outlet />
    </div>
  );
}

function AppHeader() {
  const { staff } = useStaff();
  const { user } = useCurrentUserState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const items = NAV.filter((item) => staff && canAccess(staff.role, item.page));
  const label = user?.displayName ?? staff?.name ?? "Equipe";

  function NavLinks({
    onPick,
    compact,
  }: {
    onPick?: () => void;
    compact?: boolean;
  }) {
    return items.map((item) => {
      const Icon = item.icon;
      const active =
        pathname === item.to ||
        (item.to !== "/painel" &&
          item.to !== "/pedidos" &&
          pathname.startsWith(`${item.to}/`));
      return (
        <Link
          key={item.to}
          to={item.to}
          onClick={onPick}
          className={`inline-flex min-h-11 shrink-0 items-center rounded-sm text-sm font-medium ${
            compact ? "gap-1 px-2 xl:px-2.5" : "gap-2 px-3"
          } ${active ? "bg-navy text-paper" : "text-navy hover:bg-navy/10"}`}
        >
          {compact ? (
            <Icon className="hidden size-4 shrink-0 xl:block" aria-hidden />
          ) : (
            <Icon className="size-4 shrink-0" aria-hidden />
          )}
          {item.label}
        </Link>
      );
    });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper">
      <a href="#conteudo" className="skip-link">
        Ir para o conteúdo
      </a>
      <div className="flex h-14 w-full items-center gap-2 px-2 sm:px-3 lg:px-4">
        <Link to="/painel" className="shrink-0" aria-label="Painel Karisma Pedidos">
          <Logo className="[&_img]:h-8 [&_img]:max-w-[7.5rem]" />
        </Link>
        <nav
          className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex"
          aria-label="Áreas do sistema"
        >
          <NavLinks compact />
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
          {staff ? (
            <span className="hidden sm:inline">
              <RoleTag staff={staff} />
            </span>
          ) : null}
          <button
            type="button"
            disabled={signingOut}
            className="hidden min-h-11 items-center px-2 text-sm font-medium text-navy underline lg:inline-flex"
            onClick={() => {
              setSigningOut(true);
              void signOut("/").catch(() => setSigningOut(false));
            }}
          >
            {signingOut ? "Saindo…" : "Sair"}
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm text-navy lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>
      {open ? (
        <nav
          id="mobile-nav"
          className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-line bg-paper px-3 py-3 lg:hidden"
          aria-label="Áreas do sistema"
        >
          <div className="flex flex-col gap-1">
            <NavLinks onPick={() => setOpen(false)} />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
            <p className="min-w-0 truncate text-sm text-navy">
              {label}
              {staff ? (
                <span className="ml-2 sm:hidden">
                  <RoleTag staff={staff} />
                </span>
              ) : null}
            </p>
            <button
              type="button"
              disabled={signingOut}
              className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-navy underline"
              onClick={() => {
                setSigningOut(true);
                void signOut("/").catch(() => setSigningOut(false));
              }}
            >
              {signingOut ? "Saindo…" : "Sair"}
            </button>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
