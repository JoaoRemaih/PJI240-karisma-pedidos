-- Padrão de pedido: estampa, técnica e local travados no lançamento.

alter table orders add column if not exists print_name text not null default '';
alter table orders add column if not exists technique text not null default '';
alter table orders add column if not exists print_place text not null default '';

-- Recupera os pedidos de demonstração para a fila já nascer padronizada.
update orders set
  print_name = case
    when personalization ilike '%brasão%' or personalization ilike '%brasao%' then 'Brasão escolar no peito'
    when personalization ilike '%número%' or personalization ilike '%numero%' then 'Nome e número nas costas'
    when personalization ilike '%nome no bolso%' then 'Nome do colaborador'
    when personalization ilike '%bordado%' then 'Logo bordado no peito'
    when personalization ilike '%logo%' then 'Logo silk no peito'
    when personalization = '' then 'Sem estampa'
    else 'Logo silk no peito'
  end,
  technique = case
    when personalization ilike '%brasão%' or personalization ilike '%brasao%' then 'silk'
    when personalization ilike '%número%' or personalization ilike '%numero%' then 'sublimacao'
    when personalization ilike '%bordado%' then 'bordado'
    when personalization ilike '%nome no bolso%' then 'bordado'
    when personalization = '' then 'nenhuma'
    else 'silk'
  end,
  print_place = case
    when personalization ilike '%costas%' or personalization ilike '%número%' or personalization ilike '%numero%' then 'costas'
    when personalization ilike '%bolso%' then 'peito_direito'
    when personalization = '' then 'nenhum'
    else 'peito_esquerdo'
  end
where print_name = '';
