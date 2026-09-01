import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { canAccess, type AppPage } from "@/lib/karisma/roles";
import { useStaff } from "@/components/staff-session";

export function Page({
  title,
  description,
  page,
  actions,
  children,
}: {
  title: string;
  description?: string;
  page: AppPage;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { staff, pending } = useStaff();
  if (pending) {
    return (
      <main id="conteudo" className="mx-auto max-w-6xl px-4 py-8 text-muted">
        Carregando…
      </main>
    );
  }
  if (!staff || !canAccess(staff.role, page)) {
    return (
      <main id="conteudo" className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl">Área restrita</h1>
        <p className="mt-2 text-muted">Seu perfil não acessa esta página.</p>
        <Link to="/painel" className="mt-4 inline-block font-semibold text-navy underline">
          Ir ao painel
        </Link>
      </main>
    );
  }
  return (
    <main id="conteudo" className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
      {children}
    </main>
  );
}
