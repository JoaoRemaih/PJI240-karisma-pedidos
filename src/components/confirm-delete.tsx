import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Botão "Excluir" que abre uma confirmação inline (mesmo padrão visual do
 * card de confirmação em Pedidos) antes de disparar a ação. Depois que o
 * item some da lista (query invalidada), este componente desmonta junto —
 * não precisa fechar o estado manualmente no sucesso.
 */
export function ConfirmDeleteButton({
  label = "Excluir",
  confirmTitle,
  confirmBody,
  confirmLabel = "Confirmar exclusão",
  pending,
  onConfirm,
  size = "sm",
}: {
  label?: string;
  confirmTitle: string;
  confirmBody?: string;
  confirmLabel?: string;
  pending: boolean;
  onConfirm: () => void;
  size?: "sm" | "default";
}) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <div
        role="alertdialog"
        aria-label={confirmTitle}
        className="space-y-2 rounded-md border border-danger/40 bg-danger/10 p-3"
      >
        <p className="font-display text-sm text-navy">{confirmTitle}</p>
        {confirmBody ? <p className="text-sm text-ink">{confirmBody}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="danger" disabled={pending} onClick={onConfirm}>
            {pending ? "Excluindo…" : confirmLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button type="button" size={size} variant="danger" onClick={() => setOpen(true)}>
      {label}
    </Button>
  );
}
