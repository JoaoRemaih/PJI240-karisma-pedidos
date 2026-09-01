import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/pedidos")({
  component: PedidosLayout,
});

function PedidosLayout() {
  return <Outlet />;
}
