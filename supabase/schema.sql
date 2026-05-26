-- DS Produtos - Schema do Banco de Dados Supabase
-- Execute este arquivo no SQL Editor do Supabase

-- Habilitar UUID
create extension if not exists "uuid-ossp";

-- =============================================
-- CLIENTES
-- =============================================
create table clientes (
  id uuid default uuid_generate_v4() primary key,
  nome text not null,
  telefone text,
  whatsapp text,
  endereco text,
  bairro text,
  cidade text,
  observacoes text,
  ativo boolean default true,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- =============================================
-- PRODUTOS / ESTOQUE
-- =============================================
create table produtos (
  id uuid default uuid_generate_v4() primary key,
  nome text not null,
  descricao text,
  preco_custo decimal(10,2) not null default 0,
  preco_venda decimal(10,2) not null default 0,
  unidade text default 'un',
  estoque_atual integer default 0,
  estoque_minimo integer default 5,
  ativo boolean default true,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- =============================================
-- VENDAS
-- =============================================
create table vendas (
  id uuid default uuid_generate_v4() primary key,
  cliente_id uuid references clientes(id),
  forma_pagamento text check (forma_pagamento in ('avista', 'pix', 'cartao', 'fiado')) not null,
  status text check (status in ('pago', 'pendente', 'atrasado', 'cancelado')) default 'pago',
  total decimal(10,2) not null,
  total_custo decimal(10,2) default 0,
  lucro decimal(10,2) default 0,
  desconto decimal(10,2) default 0,
  data_venda timestamptz default now(),
  data_vencimento date,
  observacoes text,
  criado_em timestamptz default now()
);

-- =============================================
-- ITENS DA VENDA
-- =============================================
create table venda_itens (
  id uuid default uuid_generate_v4() primary key,
  venda_id uuid references vendas(id) on delete cascade,
  produto_id uuid references produtos(id),
  quantidade integer not null,
  preco_unitario decimal(10,2) not null,
  preco_custo_unitario decimal(10,2) default 0,
  subtotal decimal(10,2) not null
);

-- =============================================
-- FIADOS / DÍVIDAS
-- =============================================
create table fiados (
  id uuid default uuid_generate_v4() primary key,
  venda_id uuid references vendas(id),
  cliente_id uuid references clientes(id) not null,
  valor_total decimal(10,2) not null,
  valor_pago decimal(10,2) default 0,
  valor_restante decimal(10,2),
  data_vencimento date not null,
  status text check (status in ('pendente', 'pago', 'atrasado', 'parcial')) default 'pendente',
  numero_parcelas integer default 1,
  observacoes text,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- =============================================
-- PAGAMENTOS DOS FIADOS
-- =============================================
create table fiado_pagamentos (
  id uuid default uuid_generate_v4() primary key,
  fiado_id uuid references fiados(id) on delete cascade,
  valor decimal(10,2) not null,
  forma_pagamento text check (forma_pagamento in ('dinheiro', 'pix', 'cartao')),
  data_pagamento timestamptz default now(),
  observacoes text
);

-- =============================================
-- DESPESAS / ENTRADAS FINANCEIRAS
-- =============================================
create table transacoes (
  id uuid default uuid_generate_v4() primary key,
  tipo text check (tipo in ('entrada', 'saida')) not null,
  categoria text not null,
  descricao text,
  valor decimal(10,2) not null,
  data_transacao date default current_date,
  criado_em timestamptz default now()
);

-- categorias: vendas, recebimentos, mercadoria, combustivel, transporte, embalagens, outros

-- =============================================
-- MOVIMENTAÇÃO DE ESTOQUE
-- =============================================
create table estoque_movimentos (
  id uuid default uuid_generate_v4() primary key,
  produto_id uuid references produtos(id),
  tipo text check (tipo in ('entrada', 'saida', 'ajuste')) not null,
  quantidade integer not null,
  motivo text,
  venda_id uuid references vendas(id),
  criado_em timestamptz default now()
);

-- =============================================
-- LEMBRETES / NOTIFICAÇÕES
-- =============================================
create table lembretes (
  id uuid default uuid_generate_v4() primary key,
  fiado_id uuid references fiados(id),
  cliente_id uuid references clientes(id),
  tipo text check (tipo in ('whatsapp', 'sms', 'manual')) default 'whatsapp',
  mensagem text,
  status text check (status in ('pendente', 'enviado', 'falhou')) default 'pendente',
  data_envio timestamptz,
  criado_em timestamptz default now()
);

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================
create index idx_vendas_cliente on vendas(cliente_id);
create index idx_vendas_data on vendas(data_venda);
create index idx_vendas_status on vendas(status);
create index idx_fiados_cliente on fiados(cliente_id);
create index idx_fiados_vencimento on fiados(data_vencimento);
create index idx_fiados_status on fiados(status);
create index idx_transacoes_data on transacoes(data_transacao);
create index idx_estoque_produto on estoque_movimentos(produto_id);

-- =============================================
-- TRIGGERS - ATUALIZAR valor_restante no fiado
-- =============================================
create or replace function atualizar_fiado_pagamento()
returns trigger as $$
begin
  update fiados
  set 
    valor_pago = (
      select coalesce(sum(valor), 0) 
      from fiado_pagamentos 
      where fiado_id = NEW.fiado_id
    ),
    valor_restante = valor_total - (
      select coalesce(sum(valor), 0) 
      from fiado_pagamentos 
      where fiado_id = NEW.fiado_id
    ),
    status = case 
      when valor_total <= (select coalesce(sum(valor), 0) from fiado_pagamentos where fiado_id = NEW.fiado_id)
        then 'pago'
      when (select coalesce(sum(valor), 0) from fiado_pagamentos where fiado_id = NEW.fiado_id) > 0
        then 'parcial'
      when data_vencimento < current_date
        then 'atrasado'
      else 'pendente'
    end,
    atualizado_em = now()
  where id = NEW.fiado_id;
  return NEW;
end;
$$ language plpgsql;

create trigger trigger_fiado_pagamento
after insert or update on fiado_pagamentos
for each row execute function atualizar_fiado_pagamento();

-- =============================================
-- TRIGGER - Baixar estoque na venda
-- =============================================
create or replace function baixar_estoque_venda()
returns trigger as $$
begin
  insert into estoque_movimentos (produto_id, tipo, quantidade, motivo, venda_id)
  values (NEW.produto_id, 'saida', NEW.quantidade, 'Venda', NEW.venda_id);
  
  update produtos 
  set estoque_atual = estoque_atual - NEW.quantidade,
      atualizado_em = now()
  where id = NEW.produto_id;
  
  return NEW;
end;
$$ language plpgsql;

create trigger trigger_baixar_estoque
after insert on venda_itens
for each row execute function baixar_estoque_venda();

-- =============================================
-- DADOS INICIAIS (PRODUTOS EXEMPLO)
-- =============================================
insert into produtos (nome, descricao, preco_custo, preco_venda, unidade, estoque_atual, estoque_minimo) values
('Detergente 500ml', 'Detergente neutro 500ml', 1.50, 3.00, 'un', 50, 10),
('Desinfetante 1L', 'Desinfetante pinho 1L', 3.00, 6.00, 'un', 30, 8),
('Água Sanitária 1L', 'Água sanitária 1L', 2.50, 5.00, 'un', 40, 10),
('Sabão em Pó 1kg', 'Sabão em pó 1kg', 5.00, 10.00, 'un', 25, 5),
('Amaciante 1L', 'Amaciante concentrado 1L', 4.00, 8.00, 'un', 20, 5),
('Limpador Multiuso 500ml', 'Limpador multiuso 500ml', 2.00, 4.50, 'un', 35, 8),
('Esponja de Limpeza', 'Esponja dupla face', 0.80, 2.00, 'un', 60, 15),
('Luva de Borracha M', 'Luva de borracha tamanho M', 3.50, 7.00, 'par', 20, 5);

-- =============================================
-- ROW LEVEL SECURITY (RLS) - Básico
-- =============================================
alter table clientes enable row level security;
alter table produtos enable row level security;
alter table vendas enable row level security;
alter table venda_itens enable row level security;
alter table fiados enable row level security;
alter table fiado_pagamentos enable row level security;
alter table transacoes enable row level security;
alter table estoque_movimentos enable row level security;
alter table lembretes enable row level security;

-- Políticas simples - ajustar conforme necessidade de multi-usuário
create policy "Acesso total autenticado" on clientes for all using (auth.role() = 'authenticated');
create policy "Acesso total autenticado" on produtos for all using (auth.role() = 'authenticated');
create policy "Acesso total autenticado" on vendas for all using (auth.role() = 'authenticated');
create policy "Acesso total autenticado" on venda_itens for all using (auth.role() = 'authenticated');
create policy "Acesso total autenticado" on fiados for all using (auth.role() = 'authenticated');
create policy "Acesso total autenticado" on fiado_pagamentos for all using (auth.role() = 'authenticated');
create policy "Acesso total autenticado" on transacoes for all using (auth.role() = 'authenticated');
create policy "Acesso total autenticado" on estoque_movimentos for all using (auth.role() = 'authenticated');
create policy "Acesso total autenticado" on lembretes for all using (auth.role() = 'authenticated');
