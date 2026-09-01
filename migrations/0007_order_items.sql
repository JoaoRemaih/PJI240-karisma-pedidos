-- Pedido com várias peças/tamanhos (Polo M + Polo G + calça no mesmo lançamento).

create table if not exists order_items (
  id               serial primary key,
  order_id         integer not null references orders (id) on delete cascade,
  piece            text not null,
  size             text not null,
  color            text not null,
  material_id      integer not null references materials (id),
  quantity         integer not null default 1 check (quantity > 0),
  personalization  text not null default '',
  print_name       text not null default '',
  technique        text not null default '',
  print_place      text not null default '',
  artwork_name     text not null default '',
  artwork_mime     text not null default '',
  artwork_data     text not null default '',
  sort_order       integer not null default 0
);

create index if not exists order_items_order_idx on order_items (order_id);

insert into order_items (
  order_id, piece, size, color, material_id, quantity,
  personalization, print_name, technique, print_place,
  artwork_name, artwork_mime, artwork_data, sort_order
)
select
  o.id, o.piece, o.size, o.color, o.material_id, o.quantity,
  o.personalization, coalesce(o.print_name, ''), coalesce(o.technique, ''),
  coalesce(o.print_place, ''),
  coalesce(o.artwork_name, ''), coalesce(o.artwork_mime, ''),
  coalesce(o.artwork_data, ''), 0
from orders o
where not exists (select 1 from order_items i where i.order_id = o.id);

-- Demonstração: um cliente, três linhas no mesmo pedido.
insert into orders (
  customer_id, piece, size, color, material_id, quantity,
  personalization, print_name, technique, print_place,
  due_date, notes, status, created_by, created_at, updated_at, stock_deducted
)
select
  3, 'Camisa polo', 'M', 'Preto', 1, 4,
  'Mercado São João', 'Logo bordado no peito', 'bordado', 'peito_esquerdo',
  (current_date + 7),
  'Atendimento + caixa — vários tamanhos no mesmo pedido',
  'recebido', 'seed', now() - interval '50 minutes', now() - interval '50 minutes',
  false
where not exists (
  select 1 from orders
  where notes = 'Atendimento + caixa — vários tamanhos no mesmo pedido'
);

insert into order_items (
  order_id, piece, size, color, material_id, quantity,
  personalization, print_name, technique, print_place, sort_order
)
select o.id, v.piece, v.size, v.color, v.material_id, v.quantity,
       v.personalization, v.print_name, v.technique, v.print_place, v.sort_order
from orders o
cross join (values
  ('Camisa polo',        'M', 'Preto', 1, 1, 'Mercado São João', 'Logo bordado no peito', 'bordado', 'peito_esquerdo', 0),
  ('Camisa polo',        'G', 'Preto', 1, 2, 'Mercado São João', 'Logo bordado no peito', 'bordado', 'peito_esquerdo', 1),
  ('Calça operacional',  'G', 'Caqui', 2, 1, '',                 'Sem estampa',           'nenhuma', 'nenhum',         2)
) as v(piece, size, color, material_id, quantity, personalization, print_name, technique, print_place, sort_order)
where o.notes = 'Atendimento + caixa — vários tamanhos no mesmo pedido'
  and not exists (select 1 from order_items i where i.order_id = o.id);

insert into order_events (order_id, from_status, to_status, user_id, note)
select o.id, null, 'recebido', 'seed', 'Pedido lançado no atendimento'
from orders o
where o.notes = 'Atendimento + caixa — vários tamanhos no mesmo pedido'
  and not exists (select 1 from order_events e where e.order_id = o.id);
