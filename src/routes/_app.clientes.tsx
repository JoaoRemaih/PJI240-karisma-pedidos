import { useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  lookupCep,
  updateCustomer,
} from "@/lib/karisma/api";
import { formatCep } from "@/lib/karisma/cep";
import { formatPhone } from "@/lib/karisma/format";
import type { Customer } from "@/lib/karisma/types";
import { Page } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/confirm-delete";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePageAccess } from "@/components/staff-session";

export const Route = createFileRoute("/_app/clientes")({ component: Clientes });

const empty = {
  name: "",
  phone: "",
  email: "",
  document: "",
  cep: "",
  street: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "",
  notes: "",
};

function Clientes() {
  const { staff, allowed } = usePageAccess("clientes");
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["customers"],
    queryFn: () => listCustomers(),
    enabled: allowed,
  });
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<number | null>(null);
  const [q, setQ] = useState("");

  const remove = useMutation({
    mutationFn: (id: number) => deleteCustomer({ data: { id } }),
    onSuccess: async () => {
      toast.success("Cliente excluído.");
      await qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir."),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        return updateCustomer({ data: { id: editing, ...form } });
      }
      return createCustomer({ data: form });
    },
    onSuccess: async () => {
      toast.success(editing ? "Cliente atualizado." : "Cliente cadastrado.");
      setForm(empty);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar."),
  });

  async function onCepBlur() {
    const cep = form.cep;
    if (cep.replace(/\D/g, "").length !== 8) return;
    try {
      const addr = await lookupCep({ data: cep });
      setForm((f) => ({
        ...f,
        cep: addr.cep,
        street: addr.street || f.street,
        neighborhood: addr.neighborhood || f.neighborhood,
        city: addr.city,
        state: addr.state,
      }));
      toast.success("Endereço preenchido pela API ViaCEP.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "CEP não encontrado.");
    }
  }

  const filtered = (list.data ?? []).filter((c) => {
    const hay = `${c.name} ${c.phone} ${c.document}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  function startEdit(c: Customer) {
    setEditing(c.id);
    setForm({
      name: c.name,
      phone: c.phone,
      email: c.email,
      document: c.document,
      cep: c.cep,
      street: c.street,
      number: c.number,
      neighborhood: c.neighborhood,
      city: c.city,
      state: c.state,
      notes: c.notes,
    });
  }

  return (
    <Page
      page="clientes"
      title="Clientes"
      description="Cadastro usado no lançamento do pedido. O CEP consulta a API ViaCEP e preenche o endereço."
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <Card>
          <h2 className="font-display text-lg text-navy">
            {editing ? "Editar cliente" : "Novo cliente"}
          </h2>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <Field label="Nome" htmlFor="c-name">
              <Input
                id="c-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Telefone" htmlFor="c-phone">
              <Input
                id="c-phone"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
              />
            </Field>
            <Field label="E-mail" htmlFor="c-email">
              <Input
                id="c-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="CPF / CNPJ" htmlFor="c-doc">
              <Input
                id="c-doc"
                value={form.document}
                onChange={(e) => setForm({ ...form, document: e.target.value })}
              />
            </Field>
            <Field label="CEP" htmlFor="c-cep">
              <Input
                id="c-cep"
                inputMode="numeric"
                value={form.cep}
                onChange={(e) => setForm({ ...form, cep: formatCep(e.target.value) })}
                onBlur={onCepBlur}
                aria-describedby="c-cep-help"
              />
              <p id="c-cep-help" className="mt-1 text-xs text-muted">
                Sai do campo para buscar o endereço na ViaCEP.
              </p>
            </Field>
            <Field label="Rua" htmlFor="c-street">
              <Input
                id="c-street"
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Nº" htmlFor="c-num">
                <Input
                  id="c-num"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                />
              </Field>
              <Field label="Cidade" htmlFor="c-city" className="col-span-2">
                <Input
                  id="c-city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="UF" htmlFor="c-uf">
                <Input
                  id="c-uf"
                  maxLength={2}
                  value={form.state}
                  onChange={(e) =>
                    setForm({ ...form, state: e.target.value.toUpperCase() })
                  }
                />
              </Field>
              <Field label="Bairro" htmlFor="c-bair" className="col-span-2">
                <Input
                  id="c-bair"
                  value={form.neighborhood}
                  onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Observação" htmlFor="c-notes">
              <Textarea
                id="c-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Salvando…" : editing ? "Salvar" : "Cadastrar"}
              </Button>
              {editing ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditing(null);
                    setForm(empty);
                  }}
                >
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </Card>

        <div>
          <Label htmlFor="c-search">Buscar</Label>
          <Input
            id="c-search"
            value={q}
            placeholder="Nome, telefone ou documento"
            onChange={(e) => setQ(e.target.value)}
          />
          <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-paper">
            {list.isPending ? (
              <li className="p-4 text-sm text-muted">Carregando…</li>
            ) : filtered.length === 0 ? (
              <li className="p-4 text-sm text-muted">Nenhum cliente encontrado.</li>
            ) : (
              filtered.map((c) => (
                <li key={c.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-muted">
                      {c.phone || "sem telefone"}
                      {c.city ? ` · ${c.city}/${c.state}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => startEdit(c)}>
                      Editar
                    </Button>
                    {staff?.role === "admin" ? (
                      <ConfirmDeleteButton
                        confirmTitle={`Excluir ${c.name}?`}
                        confirmBody="Só funciona se este cliente nunca teve pedido lançado. Não tem como desfazer."
                        pending={remove.isPending}
                        onConfirm={() => remove.mutate(c.id)}
                      />
                    ) : null}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </Page>
  );
}

function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
