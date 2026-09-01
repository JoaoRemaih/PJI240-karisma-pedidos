-- Fila e lista de pedidos: filtro por status + prazo sem varrer a tabela.
create index if not exists orders_status_due_created_idx
  on orders (status, due_date, created_at);

create index if not exists orders_created_idx on orders (created_at desc);

create index if not exists order_items_material_idx on order_items (material_id);
