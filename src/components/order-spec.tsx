import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { describeCustomization } from "@/lib/karisma/catalog";
import { formatDate } from "@/lib/karisma/format";
import { groupOrderItems } from "@/lib/karisma/order-items";
import { getOrderArtwork } from "@/lib/karisma/api";
import type { Order, OrderItem } from "@/lib/karisma/types";
import { Button } from "@/components/ui/button";

type Spec = Pick<
  Order,
  | "quantity"
  | "piece"
  | "size"
  | "color"
  | "materialName"
  | "printName"
  | "technique"
  | "printPlace"
  | "personalization"
  | "dueDate"
  | "notes"
  | "customerName"
> & {
  id?: number;
  hasArtwork?: boolean;
  artworkName?: string;
  items?: OrderItem[];
};

export function OrderSpec({
  order,
  showCustomer = true,
  showDue = true,
}: {
  order: Spec;
  showCustomer?: boolean;
  showDue?: boolean;
}) {
  const items: OrderItem[] =
    order.items && order.items.length > 0
      ? order.items
      : [
          {
            id: 0,
            piece: order.piece,
            size: order.size,
            color: order.color,
            materialId: 0,
            materialName: order.materialName,
            materialUnit: "",
            quantity: order.quantity,
            personalization: order.personalization,
            printName: order.printName,
            technique: order.technique,
            printPlace: order.printPlace,
            artworkName: order.artworkName ?? "",
            hasArtwork: Boolean(order.hasArtwork),
          },
        ];
  const groups = groupOrderItems(items);
  const total = items.reduce((n, i) => n + i.quantity, 0);

  return (
    <div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
        {showCustomer && order.customerName ? (
          <>
            <dt className="text-muted">Cliente</dt>
            <dd className="font-medium text-ink">{order.customerName}</dd>
          </>
        ) : null}
        <dt className="text-muted">Peças</dt>
        <dd className="font-medium text-ink">
          {total} {total === 1 ? "peça" : "peças"}
          {groups.length > 1 ? ` · ${groups.length} itens` : ""}
        </dd>
      </dl>
      <ul className="mt-3 space-y-3">
        {groups.map((group) => (
          <li key={group.key} className="rounded-md border border-line bg-paper p-3">
            <p className="font-medium text-navy">{group.piece}</p>
            <p className="text-sm text-ink">
              {group.color} · {group.materialName}
            </p>
            <p className="mt-1 flex flex-wrap gap-1.5">
              {group.sizes.map((s) => (
                <span
                  key={`${group.key}-${s.size}-${s.id}`}
                  className="rounded-sm bg-mist px-2 py-0.5 text-xs font-semibold tabular-nums text-navy"
                >
                  {s.quantity}× {s.size}
                </span>
              ))}
            </p>
            <p className="mt-1 text-xs text-muted">{describeCustomization(group)}</p>
            {group.hasArtwork && order.id ? (
              <ArtworkThumb
                orderId={order.id}
                itemId={group.firstItemId || undefined}
                name={group.artworkName}
              />
            ) : null}
          </li>
        ))}
      </ul>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
        {showDue ? (
          <>
            <dt className="text-muted">Prazo</dt>
            <dd className="font-medium text-ink">{formatDate(order.dueDate)}</dd>
          </>
        ) : null}
        {order.notes ? (
          <>
            <dt className="text-muted">Obs.</dt>
            <dd className="text-ink">{order.notes}</dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}

function ArtworkThumb({
  orderId,
  itemId,
  name,
}: {
  orderId: number;
  itemId?: number;
  name?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setPending(true);
    void getOrderArtwork({ data: { orderId, itemId } })
      .then((file) => {
        if (!cancelled) setSrc(file.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Não abriu a arte.");
      })
      .finally(() => {
        if (!cancelled) setPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, itemId]);

  return (
    <div className="mt-3 rounded-md border border-navy/20 bg-mist p-3">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-navy">
        <ImageIcon className="size-3.5" aria-hidden />
        Logo / arte {name ? `· ${name}` : ""}
      </p>
      {src ? (
        <img src={src} alt="Arte do pedido" className="max-h-40 rounded-sm border border-line bg-paper" />
      ) : pending ? (
        <p className="text-sm text-muted">Carregando arte…</p>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setError(null);
            setPending(true);
            void getOrderArtwork({ data: { orderId, itemId } })
              .then((file) => setSrc(file.data))
              .catch((err) => setError(err instanceof Error ? err.message : "Não abriu a arte."))
              .finally(() => setPending(false));
          }}
        >
          Ver logo / arte
        </Button>
      )}
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
