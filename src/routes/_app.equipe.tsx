import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { inviteStaff, listStaff, setStaffActive } from "@/lib/karisma/api";
import { ROLE_LABEL, ROLES, type Role } from "@/lib/karisma/types";
import { Page } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { usePageAccess } from "@/components/staff-session";

export const Route = createFileRoute("/_app/equipe")({ component: Equipe });

function Equipe() {
  const { staff: me, allowed } = usePageAccess("equipe");
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["staff"],
    queryFn: () => listStaff(),
    enabled: allowed,
  });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("atendimento");

  const invite = useMutation({
    mutationFn: () => inviteStaff({ data: { name, email, role } }),
    onSuccess: async () => {
      toast.success("E-mail liberado. A pessoa ativa o acesso na tela de entrar.");
      setName("");
      setEmail("");
      await qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Não foi possível cadastrar."),
  });

  const toggle = useMutation({
    mutationFn: (input: { id: number; active: boolean }) =>
      setStaffActive({ data: input }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar."),
  });

  return (
    <Page
      page="equipe"
      title="Equipe"
      description="Só quem está nesta lista entra no sistema. Cliente da loja não se cadastra. E-mail solto fica bloqueado."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <Card>
          <h2 className="font-display text-lg text-navy">Liberar acesso</h2>
          <p className="mt-1 text-sm text-muted">
            Cadastre o e-mail e o perfil. A pessoa só ativa o acesso com esse
            e-mail — senha com letra e número, ou Google/X da mesma conta.
            Produção não vê telefone de cliente; estoque e relatórios ficam
            só com a administração.
          </p>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              invite.mutate();
            }}
          >
            <div>
              <Label htmlFor="e-name">Nome</Label>
              <Input id="e-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="e-email">E-mail</Label>
              <Input
                id="e-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="e-role">Perfil</Label>
              <Select
                id="e-role"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" disabled={invite.isPending}>
              Cadastrar na equipe
            </Button>
          </form>
        </Card>
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {(list.data ?? []).map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">
                    {s.name}{" "}
                    <span className="text-sm font-normal text-muted">
                      {ROLE_LABEL[s.role]}
                    </span>
                  </p>
                  <p className="text-sm text-muted">
                    {s.email}
                    {s.userId ? " · acesso ativo" : " · ainda não entrou"}
                    {!s.active ? " · desativado" : ""}
                  </p>
                </div>
                {me?.id !== s.id ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={s.active ? "outline" : "navy"}
                    disabled={toggle.isPending}
                    onClick={() => toggle.mutate({ id: s.id, active: !s.active })}
                  >
                    {s.active ? "Desativar" : "Reativar"}
                  </Button>
                ) : (
                  <span className="text-xs text-muted">você</span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Page>
  );
}
