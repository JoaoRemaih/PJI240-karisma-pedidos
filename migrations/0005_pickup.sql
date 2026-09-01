-- Baixa de retirada: quem levou, pagamento e comprovante (arquivo no próprio banco)

alter table orders add column if not exists pickup_name text not null default '';
alter table orders add column if not exists payment_method text not null default '';
alter table orders add column if not exists pickup_at timestamptz;
alter table orders add column if not exists receipt_name text not null default '';
alter table orders add column if not exists receipt_mime text not null default '';
alter table orders add column if not exists receipt_data text not null default '';
