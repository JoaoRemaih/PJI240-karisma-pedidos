-- Karisma Pedidos — loja de uniformes (dados compartilhados da equipe)

create table if not exists staff (
  id          serial primary key,
  user_id     text unique,
  email       text not null unique,
  name        text not null,
  role        text not null check (role in ('admin', 'atendimento', 'producao')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists staff_email_idx on staff (lower(email));

create table if not exists customers (
  id            serial primary key,
  name          text not null,
  phone         text not null default '',
  email         text not null default '',
  document      text not null default '',
  cep           text not null default '',
  street        text not null default '',
  number        text not null default '',
  neighborhood  text not null default '',
  city          text not null default '',
  state         text not null default '',
  notes         text not null default '',
  created_by    text not null,
  created_at    timestamptz not null default now()
);

create index if not exists customers_name_idx on customers (lower(name));

create table if not exists materials (
  id             serial primary key,
  name           text not null unique,
  unit           text not null,
  quantity       numeric(12, 2) not null default 0,
  min_quantity   numeric(12, 2) not null default 0,
  qty_per_piece  numeric(12, 2) not null default 1,
  active         boolean not null default true,
  updated_at     timestamptz not null default now()
);

create table if not exists orders (
  id               serial primary key,
  customer_id      integer not null references customers (id),
  piece            text not null,
  size             text not null,
  color            text not null,
  material_id      integer not null references materials (id),
  quantity         integer not null default 1 check (quantity > 0),
  personalization  text not null default '',
  due_date         date not null,
  notes            text not null default '',
  status           text not null default 'recebido'
                   check (status in ('recebido', 'em_producao', 'pronto', 'retirado')),
  created_by       text not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  stock_deducted   boolean not null default false
);

create index if not exists orders_status_idx on orders (status);
create index if not exists orders_due_idx on orders (due_date);
create index if not exists orders_customer_idx on orders (customer_id);

create table if not exists order_events (
  id           serial primary key,
  order_id     integer not null references orders (id) on delete cascade,
  from_status  text,
  to_status    text not null,
  user_id      text not null,
  note         text not null default '',
  created_at   timestamptz not null default now()
);

create index if not exists order_events_order_idx on order_events (order_id);

create table if not exists stock_movements (
  id           serial primary key,
  material_id  integer not null references materials (id),
  order_id     integer references orders (id) on delete set null,
  delta        numeric(12, 2) not null,
  reason       text not null,
  user_id      text not null,
  created_at   timestamptz not null default now()
);

create index if not exists stock_movements_material_idx on stock_movements (material_id);

-- Catálogo inicial de materiais (Novo Horizonte / loja Karisma)
insert into materials (name, unit, quantity, min_quantity, qty_per_piece)
select * from (values
  ('Malha PV 30/1',           'm',  180.00, 40.00, 1.20),
  ('Brim 100% algodão',       'm',   95.00, 30.00, 1.40),
  ('Dry-fit',                 'm',  220.00, 50.00, 1.10),
  ('Oxford',                  'm',   18.00, 25.00, 1.30),
  ('Helanca',                 'm',   12.00, 20.00, 0.80),
  ('Gola polo',               'un', 340.00, 80.00, 1.00),
  ('Botão',                   'un', 2000.00, 400.00, 4.00),
  ('Linha (cone)',            'un',  28.00, 10.00, 0.05),
  ('Zíper 20 cm',             'un',  60.00, 30.00, 1.00),
  ('Elástico',                'm',   50.00, 15.00, 0.60),
  ('Tecido escolar (malha)',  'm',  140.00, 35.00, 1.00),
  ('Tecido social (tricoline)','m',  70.00, 20.00, 1.50)
) as v(name, unit, quantity, min_quantity, qty_per_piece)
where not exists (select 1 from materials);

-- Clientes de demonstração (Novo Horizonte e região)
insert into customers (name, phone, email, document, cep, street, number, neighborhood, city, state, notes, created_by)
select * from (values
  ('Colégio Horizonte',            '(17) 3542-1100', 'secretaria@colegiohorizonte.exemplo', '12.345.678/0001-90', '14960-000', 'Rua 9 de Julho', '210', 'Centro', 'Novo Horizonte', 'SP', 'Uniforme escolar 2026', 'seed'),
  ('Escola Municipal Castro Alves','(17) 3542-2211', 'escolacastroalves@exemplo.com', '00.000.000/0001-00', '14960-000', 'Av. Cel. Junqueira', '80', 'Centro', 'Novo Horizonte', 'SP', 'Turmas do fundamental', 'seed'),
  ('Mercado São João',             '(17) 99211-4400', 'contato@mercadosaojoao.exemplo', '23.456.789/0001-11', '14960-000', 'Rua Dom Pedro II', '455', 'Centro', 'Novo Horizonte', 'SP', 'Operacional e caixa', 'seed'),
  ('Padaria Central',              '(17) 3542-3344', 'padariacentral@exemplo.com', '', '14960-000', 'Praça Padre Paulo Lepick', '40', 'Centro', 'Novo Horizonte', 'SP', 'Avental e camiseta', 'seed'),
  ('Auto Peças NH',                '(17) 99888-1200', 'pecas@autopeçasnh.exemplo', '34.567.890/0001-22', '14960-000', 'Av. da Saudade', '1020', 'Jardim América', 'Novo Horizonte', 'SP', 'Jaleco de oficina', 'seed'),
  ('Farmácia do Centro',           '(17) 3542-5566', 'farmacia.centro@exemplo.com', '45.678.901/0001-33', '14960-000', 'Rua 7 de Setembro', '118', 'Centro', 'Novo Horizonte', 'SP', 'Jaleco e polo atendimento', 'seed'),
  ('Clube Recreativo Horizonte',   '(17) 99123-7788', 'esporte@clubehorizonte.exemplo', '', '14960-000', 'Rua das Palmeiras', '50', 'Vila Nova', 'Novo Horizonte', 'SP', 'Time de futsal', 'seed'),
  ('Construtora Vale Verde',       '(17) 99654-0099', 'rh@valeverde.exemplo', '56.789.012/0001-44', '14960-000', 'Rua Industrial', '800', 'Distrito Industrial', 'Novo Horizonte', 'SP', 'Operacional brim', 'seed')
) as v(name, phone, email, document, cep, street, number, neighborhood, city, state, notes, created_by)
where not exists (select 1 from customers);

-- Pedidos de demonstração em vários status (a fila da produção já nasce com trabalho)
insert into orders (customer_id, piece, size, color, material_id, quantity, personalization, due_date, notes, status, created_by, created_at, updated_at, stock_deducted)
select * from (values
  (1, 'Camiseta escolar',     'M',  'Azul marinho', 11, 40, 'Logo do colégio + nome',           (current_date + 12), 'Turma 8º ano',           'recebido',    'seed', now() - interval '1 day',  now() - interval '1 day',  false),
  (1, 'Camiseta escolar',     'G',  'Azul marinho', 11, 35, 'Logo do colégio + nome',           (current_date + 12), 'Turma 8º ano',           'recebido',    'seed', now() - interval '1 day',  now() - interval '1 day',  false),
  (3, 'Camisa polo',          'G',  'Preto',         1, 12, 'Bordado Mercado São João no peito',(current_date + 5),  'Urgente para inauguração','recebido',    'seed', now() - interval '3 hours', now() - interval '3 hours', false),
  (8, 'Calça operacional',    'GG', 'Caqui',         2, 20, 'Nome no bolso',                    (current_date + 8),  'Obra da rodovia',        'recebido',    'seed', now() - interval '2 days', now() - interval '2 days', false),
  (5, 'Jaleco',               'G',  'Cinza',         2,  8, 'Auto Peças NH nas costas',         (current_date + 2),  'Oficina',                'em_producao', 'seed', now() - interval '4 days', now() - interval '1 day',  true),
  (6, 'Jaleco',               'M',  'Branco',       12,  6, 'Farmácia do Centro + cruz',        (current_date + 4),  'Atendimento',            'em_producao', 'seed', now() - interval '3 days', now() - interval '6 hours', true),
  (7, 'Camisa dry-fit',       'M',  'Verde limão',   3, 18, 'Número + nome do jogador',         (current_date + 6),  'Futsal masculino',       'em_producao', 'seed', now() - interval '2 days', now() - interval '2 days', true),
  (4, 'Avental',              'G',  'Bordô',         2,  4, 'Padaria Central',                  (current_date - 1),  'Balcão',                 'pronto',      'seed', now() - interval '8 days', now() - interval '1 day',  true),
  (2, 'Agasalho escolar',     'P',  'Azul royal',    5, 25, 'Brasão da escola',                 (current_date + 20), 'Inverno',                'pronto',      'seed', now() - interval '10 days', now() - interval '2 days', true),
  (6, 'Camisa polo',          'P',  'Branco',        1,  5, 'Farmácia do Centro',               (current_date - 3),  'Já avisado no WhatsApp', 'retirado',    'seed', now() - interval '15 days', now() - interval '3 days', true),
  (3, 'Camisa polo',          'M',  'Preto',         1, 10, 'Bordado Mercado São João',         (current_date - 10), 'Primeiro lote',          'retirado',    'seed', now() - interval '20 days', now() - interval '10 days', true),
  (8, 'Camisa polo',          'G',  'Azul marinho',  1,  6, 'Construtora Vale Verde',           (current_date + 15), 'Administrativo',         'recebido',    'seed', now() - interval '5 hours', now() - interval '5 hours', false)
) as v(customer_id, piece, size, color, material_id, quantity, personalization, due_date, notes, status, created_by, created_at, updated_at, stock_deducted)
where not exists (select 1 from orders);

insert into order_events (order_id, from_status, to_status, user_id, note)
select o.id, null, 'recebido', 'seed', 'Pedido lançado no atendimento'
from orders o
where o.created_by = 'seed'
  and not exists (select 1 from order_events e where e.order_id = o.id);

insert into order_events (order_id, from_status, to_status, user_id, note)
select o.id, 'recebido', o.status, 'seed', 'Atualizado na produção'
from orders o
where o.created_by = 'seed'
  and o.status <> 'recebido'
  and not exists (
    select 1 from order_events e
    where e.order_id = o.id and e.to_status = o.status
  );
