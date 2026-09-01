-- Pedidos escolares pequenos (a surpresa) + histórico da temporada.

insert into orders (
  customer_id, piece, size, color, material_id, quantity, personalization,
  print_name, technique, print_place, due_date, notes, status, created_by,
  created_at, updated_at, stock_deducted
)
select * from (values
  (2, 'Camiseta escolar', 'P',  'Azul marinho', 11, 18, 'Brasão da escola',
      'Brasão escolar no peito', 'silk', 'peito_esquerdo',
      (current_date + 9), 'Fundamental I — pedido avulso', 'recebido', 'seed',
      now() - interval '6 hours', now() - interval '6 hours', false),
  (1, 'Camiseta escolar', '10', 'Azul marinho', 11, 22, 'Logo do colégio + nome',
      'Brasão escolar no peito', 'silk', 'peito_esquerdo',
      (current_date + 11), 'Turma 5º ano', 'recebido', 'seed',
      now() - interval '4 hours', now() - interval '4 hours', false),
  (2, 'Camiseta escolar', 'G',  'Azul marinho', 11, 15, 'Brasão da escola',
      'Brasão escolar no peito', 'silk', 'peito_esquerdo',
      (current_date + 10), 'Reposição de tamanho', 'recebido', 'seed',
      now() - interval '2 hours', now() - interval '2 hours', false),
  (1, 'Agasalho escolar', 'M',  'Azul marinho', 5, 10, 'Brasão da escola',
      'Brasão escolar no peito', 'silk', 'peito_esquerdo',
      (current_date + 14), 'Inverno — lote 1', 'recebido', 'seed',
      now() - interval '8 hours', now() - interval '8 hours', false),
  (2, 'Agasalho escolar', '8',  'Azul royal', 5, 8, 'Brasão da escola',
      'Brasão escolar no peito', 'silk', 'peito_esquerdo',
      (current_date + 16), 'Inverno — lote 2', 'recebido', 'seed',
      now() - interval '7 hours', now() - interval '7 hours', false)
) as v(
  customer_id, piece, size, color, material_id, quantity, personalization,
  print_name, technique, print_place, due_date, notes, status, created_by,
  created_at, updated_at, stock_deducted
)
where not exists (
  select 1 from orders
  where created_by = 'seed' and notes = 'Fundamental I — pedido avulso'
);

insert into order_events (order_id, from_status, to_status, user_id, note)
select o.id, null, 'recebido', 'seed', 'Pedido lançado no atendimento'
from orders o
where o.created_by = 'seed'
  and not exists (select 1 from order_events e where e.order_id = o.id);

-- Histórico da temporada (já retirado) para o gráfico não nascer vazio.
insert into orders (
  customer_id, piece, size, color, material_id, quantity, personalization,
  print_name, technique, print_place, due_date, notes, status, created_by,
  created_at, updated_at, stock_deducted
)
select * from (values
  (1, 'Camiseta escolar', 'M', 'Azul marinho', 11, 80, 'Logo do colégio',
      'Brasão escolar no peito', 'silk', 'peito_esquerdo',
      (current_date - 180), 'Volta às aulas 2026', 'retirado', 'seed',
      date_trunc('month', current_date) - interval '7 months' + interval '10 days',
      date_trunc('month', current_date) - interval '7 months' + interval '20 days', true),
  (2, 'Camiseta escolar', 'G', 'Azul marinho', 11, 60, 'Brasão da escola',
      'Brasão escolar no peito', 'silk', 'peito_esquerdo',
      (current_date - 150), 'Volta às aulas 2026', 'retirado', 'seed',
      date_trunc('month', current_date) - interval '6 months' + interval '8 days',
      date_trunc('month', current_date) - interval '6 months' + interval '18 days', true),
  (1, 'Agasalho escolar', 'M', 'Azul marinho', 5, 50, 'Brasão da escola',
      'Brasão escolar no peito', 'silk', 'peito_esquerdo',
      (current_date - 70), 'Inverno 2026', 'retirado', 'seed',
      date_trunc('month', current_date) - interval '2 months' + interval '5 days',
      date_trunc('month', current_date) - interval '2 months' + interval '15 days', true)
) as v(
  customer_id, piece, size, color, material_id, quantity, personalization,
  print_name, technique, print_place, due_date, notes, status, created_by,
  created_at, updated_at, stock_deducted
)
where not exists (
  select 1 from orders where notes = 'Volta às aulas 2026' limit 1
);
