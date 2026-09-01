import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { getMe } from "@/lib/karisma/api";
import { canAccess, type AppPage } from "@/lib/karisma/roles";
import type { Staff } from "@/lib/karisma/types";
import { ROLE_LABEL } from "@/lib/karisma/types";

type StaffState = {
  staff: Staff | null;
  pending: boolean;
  status: "ok" | "pending" | "loading";
};

const StaffContext = createContext<StaffState>({
  staff: null,
  pending: true,
  status: "loading",
});

export function StaffProvider({ children }: { children: ReactNode }) {
  const q = useQuery({
    queryKey: ["me"],
    queryFn: () => getMe(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const status =
    q.isPending || !q.data
      ? "loading"
      : q.data.status === "ok"
        ? "ok"
        : "pending";
  return (
    <StaffContext.Provider
      value={{
        staff: q.data?.staff ?? null,
        pending: q.isPending,
        status,
      }}
    >
      {children}
    </StaffContext.Provider>
  );
}

export function useStaff() {
  return useContext(StaffContext);
}

export function usePageAccess(page: AppPage) {
  const { staff, pending, status } = useStaff();
  const loading = pending || status === "loading";
  const allowed = !!staff && canAccess(staff.role, page);
  return { staff, loading, allowed };
}

export function PendingAccess() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="font-display text-2xl">Acesso pendente</h1>
      <p className="mt-3 text-muted">
        Você entrou, mas este e-mail ainda não faz parte da equipe da Karisma.
        Peça à administração para cadastrá-lo em Equipe, com o perfil de
        atendimento ou produção. Sem convite, o sistema não libera nada.
      </p>
      <p className="mt-6">
        <Link to="/" className="font-semibold text-navy underline">
          Voltar ao início
        </Link>
      </p>
    </main>
  );
}

export function RoleTag({ staff }: { staff: Staff }) {
  return (
    <span className="rounded-full bg-navy/10 px-2 py-0.5 text-xs font-semibold text-navy">
      {ROLE_LABEL[staff.role]}
    </span>
  );
}
