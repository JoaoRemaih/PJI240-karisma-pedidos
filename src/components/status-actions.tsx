import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { changeOrderStatus, getOrderReceipt } from "@/lib/karisma/api";
import { nextStatuses, transitionNotice } from "@/lib/karisma/status";
import { PAYMENT_METHODS, PAYMENT_LABEL, RECEIPT_MAX_BYTES, paymentLabel } from "@/lib/karisma/pickup";
import { STATUS_LABEL, type Order, type OrderStatus, type Role } from "@/lib/karisma/types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useStaff } from "@/components/staff-session";

export function StatusActions({ order }: { order: Order }) {
  const { staff } = useStaff();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmTo, setConfirmTo] = useState<OrderStatus | null>(null);
  const [pickupOpen, setPickupOpen] = useState(false);
  const role: Role = staff?.role ?? "atendimento";
  const options = nextStatuses(order.status, role);
  const notice = confirmTo ? transitionNotice(order.status, confirmTo) : null;

  const mut = useMutation({
    mutationFn: (payload: {
      to: OrderStatus;
      pickupName?: string;
      paymentMethod?: (typeof PAYMENT_METHODS)[number];
      receiptName?: string;
      receiptMime?: string;
      receiptData?: string;
    }) =>
      changeOrderStatus({
        data: { orderId: order.id, ...payload },
      }),
    onSuccess: async (res) => {
      if (res.warning) toast.warning(res.warning);
      else toast.success(`Pedido nº ${order.id} → ${STATUS_LABEL[res.order.status]}`);
      setPickupOpen(false);
      setConfirmTo(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["orders"] }),
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
        qc.invalidateQueries({ queryKey: ["materials"] }),
        qc.invalidateQueries({ queryKey: ["report"] }),
      ]);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar.");
    },
  });

  function ask(to: OrderStatus) {
    if (to === "retirado") {
      setConfirmTo(null);
      setPickupOpen(true);
      return;
    }
    setPickupOpen(false);
    setConfirmTo(to);
  }

  function commit(to: OrderStatus) {
    setBusy(to);
    mut.mutate({ to }, { onSettled: () => setBusy(null) });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Status atual
        </span>
        <StatusBadge status={order.status} />
      </div>
      {options.length > 0 && !pickupOpen && !notice ? (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            Avançar para
          </p>
          <div className="flex flex-wrap gap-2">
            {options.map((to) => (
              <Button
                key={to}
                type="button"
                size="sm"
                variant={to === "em_producao" ? "lime" : to === "retirado" ? "navy" : "outline"}
                disabled={mut.isPending}
                onClick={() => ask(to)}
              >
                {STATUS_LABEL[to]}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
      {notice ? (
        <div
          role="alertdialog"
          aria-labelledby={`confirm-title-${order.id}`}
          aria-describedby={`confirm-body-${order.id}`}
          className={`rounded-md border p-3 space-y-3 ${
            notice.warnStock ? "border-warning/40 bg-warning/10" : "border-navy/20 bg-mist"
          }`}
        >
          <p id={`confirm-title-${order.id}`} className="font-display text-sm text-navy">
            {notice.title}
          </p>
          <p id={`confirm-body-${order.id}`} className="text-sm text-ink">
            {notice.body}
          </p>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Pedido nº {order.id} · {STATUS_LABEL[order.status]} → {STATUS_LABEL[notice.to]}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={notice.warnStock ? "lime" : "navy"}
              disabled={mut.isPending}
              onClick={() => commit(notice.to)}
            >
              {busy === notice.to ? "Salvando…" : notice.confirmLabel}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={mut.isPending}
              onClick={() => setConfirmTo(null)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}
      {order.status === "retirado" ? <PickupSummary order={order} /> : null}
      {pickupOpen ? (
        <PickupForm
          order={order}
          pending={mut.isPending}
          onCancel={() => setPickupOpen(false)}
          onSave={(payload) => {
            setBusy("retirado");
            mut.mutate({ to: "retirado", ...payload }, { onSettled: () => setBusy(null) });
          }}
        />
      ) : null}
    </div>
  );
}

function PickupSummary({ order }: { order: Order }) {
  async function openReceipt() {
    try {
      const file = await getOrderReceipt({ data: { orderId: order.id } });
      const win = window.open();
      if (!win) {
        toast.error("Permita pop-up para ver o comprovante.");
        return;
      }
      if (!file.data.startsWith("data:image/") && !file.data.startsWith("data:application/pdf")) {
        toast.error("Comprovante inválido.");
        win.close();
        return;
      }
      if (file.data.startsWith("data:application/pdf")) {
        win.location.href = file.data;
        return;
      }
      const img = win.document.createElement("img");
      img.alt = "Comprovante de pagamento";
      img.src = file.data;
      img.style.maxWidth = "100%";
      win.document.title = "Comprovante";
      win.document.body.appendChild(img);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Comprovante indisponível.");
    }
  }

  if (!order.pickupName && !order.paymentMethod) return null;
  return (
    <p className="text-xs text-muted">
      Retirado por <span className="font-medium text-ink">{order.pickupName}</span>
      {order.paymentMethod ? ` · ${paymentLabel(order.paymentMethod)}` : null}
      {order.hasReceipt ? (
        <>
          {" · "}
          <button type="button" className="font-semibold text-navy underline" onClick={openReceipt}>
            Ver comprovante
          </button>
        </>
      ) : null}
    </p>
  );
}

function PickupForm({
  order,
  pending,
  onCancel,
  onSave,
}: {
  order: Order;
  pending: boolean;
  onCancel: () => void;
  onSave: (payload: {
    pickupName: string;
    paymentMethod: (typeof PAYMENT_METHODS)[number];
    receiptName?: string;
    receiptMime?: string;
    receiptData?: string;
  }) => void;
}) {
  const [pickupName, setPickupName] = useState(order.customerName);
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]>("pix");
  const [receiptName, setReceiptName] = useState("");
  const [receiptMime, setReceiptMime] = useState("");
  const [receiptData, setReceiptData] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onFile(file: File | undefined) {
    setError(null);
    if (!file) {
      setReceiptName("");
      setReceiptMime("");
      setReceiptData("");
      return;
    }
    if (file.size > RECEIPT_MAX_BYTES) {
      setError("Comprovante no máximo 800 KB (foto ou PDF).");
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setError("Envie foto (JPG/PNG) ou PDF.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setReceiptName(file.name);
      setReceiptMime(file.type);
      setReceiptData(String(reader.result ?? ""));
    };
    reader.readAsDataURL(file);
  }

  return (
    <form
      className="rounded-md border border-navy/20 bg-mist p-3 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (pickupName.trim().length < 2) {
          setError("Informe quem retirou.");
          return;
        }
        onSave({
          pickupName: pickupName.trim(),
          paymentMethod,
          receiptName: receiptName || undefined,
          receiptMime: receiptMime || undefined,
          receiptData: receiptData || undefined,
        });
      }}
    >
      <p className="font-display text-sm text-navy">Baixa da retirada · pedido nº {order.id}</p>
      <p className="text-sm text-ink">
        Depois de confirmar, o pedido sai da fila e não volta. Confira quem levou e como pagou.
      </p>
      <div>
        <Label htmlFor={`pickup-${order.id}`}>Quem retirou</Label>
        <Input
          id={`pickup-${order.id}`}
          value={pickupName}
          onChange={(e) => setPickupName(e.target.value)}
          required
          autoComplete="name"
        />
      </div>
      <div>
        <Label htmlFor={`pay-${order.id}`}>Forma de pagamento</Label>
        <Select
          id={`pay-${order.id}`}
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as (typeof PAYMENT_METHODS)[number])}
        >
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {PAYMENT_LABEL[method]}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor={`rec-${order.id}`}>Comprovante (opcional)</Label>
        <Input
          id={`rec-${order.id}`}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <p className="mt-1 text-xs text-muted">
          Foto ou PDF até 800 KB. Fica gravado no pedido, no banco da loja.
        </p>
        {receiptName ? <p className="text-xs text-navy">{receiptName}</p> : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Salvando…" : "Confirmar retirada"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
