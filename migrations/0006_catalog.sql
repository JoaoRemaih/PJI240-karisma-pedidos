-- Catálogo editável (peças e estampas) + arte anexada no pedido

create table if not exists catalog_pieces (
  id          serial primary key,
  name        text not null unique,
  category    text not null,
  image       text not null default '/uniforms/uni_01.jpg',
  size_set    text not null default 'adulto',
  colors      text not null default '[]',
  materials   text not null default '[]',
  techniques  text not null default '[]',
  active      boolean not null default true,
  sort_order  integer not null default 0
);

create table if not exists catalog_prints (
  id                 text primary key,
  name               text not null,
  hint               text not null default '',
  technique          text not null,
  place              text not null,
  needs_text         boolean not null default false,
  text_label         text not null default '',
  text_placeholder   text not null default '',
  categories         text not null default '"todas"',
  active             boolean not null default true,
  sort_order         integer not null default 0
);

alter table orders add column if not exists artwork_name text not null default '';
alter table orders add column if not exists artwork_mime text not null default '';
alter table orders add column if not exists artwork_data text not null default '';
