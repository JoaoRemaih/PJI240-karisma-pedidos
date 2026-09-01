import { createFileRoute } from "@tanstack/react-router";
import { OrderWizard } from "@/components/order-wizard";
import { Page } from "@/components/page";

export const Route = createFileRoute("/_app/pedidos/novo")({
  component: NovoPedido,
});

function NovoPedido() {
  return (
    <Page
      page="pedidos-novo"
      title="Novo pedido"
      description="Várias peças no mesmo lançamento: Polo M, Polo G e calça juntos. Tamanho, cor, tecido e estampa vêm do catálogo — não tem como sair combinação solta."
    >
      <OrderWizard />
    </Page>
  );
}
