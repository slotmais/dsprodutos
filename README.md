# DS Produtos — Sistema de Gestão de Vendas

Sistema web completo para vendedor porta a porta, com controle de clientes, vendas, fiados, estoque, financeiro e relatórios.

## 🛠 Tecnologias

- **Next.js 14** (App Router) — Framework React
- **Supabase** — Banco de dados PostgreSQL + Auth
- **Tailwind CSS** — Estilização
- **Recharts** — Gráficos nos relatórios
- **Vercel** — Hospedagem

---

## 🚀 Passo a Passo para Configurar

### 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Clique em **"New Project"**
3. Defina nome: `ds-produtos`, escolha região mais próxima (South America - São Paulo)
4. Guarde a senha do banco de dados
5. No painel do projeto, vá em **SQL Editor**
6. Cole o conteúdo do arquivo `supabase/schema.sql` e execute (**Run**)
7. Vá em **Settings → API** e copie:
   - `Project URL` → será o `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → será o `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Configurar variáveis de ambiente localmente

```bash
cp .env.local.example .env.local
```

Edite o `.env.local` com as chaves copiadas do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://XXXXXXXXXXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Instalar dependências e rodar localmente

```bash
npm install
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

### 4. Deploy no Vercel

#### Opção A — Via GitHub (recomendado)

1. Suba o projeto para um repositório GitHub
2. Acesse [vercel.com](https://vercel.com) e faça login
3. Clique em **"Add New Project"** → importe o repositório
4. Na tela de configuração, adicione as **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Clique em **Deploy**

#### Opção B — Via Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
# siga as instruções e adicione as env vars quando pedido
```

---

## 📱 Funcionalidades

| Módulo | Funcionalidades |
|--------|----------------|
| **Dashboard** | KPIs do dia, alertas de vencimento, botão de WhatsApp para cobranças |
| **Clientes** | Cadastro, busca, histórico, saldo devedor |
| **Vendas** | Registro rápido, múltiplos produtos, cálculo automático de lucro, fiado integrado |
| **Fiados** | Listagem por status, barra de progresso de pagamento, cobrar via WhatsApp |
| **Financeiro** | Lançamentos de entrada/saída, saldo mensal |
| **Estoque** | Cadastro de produtos, alerta de estoque baixo, reposição |
| **Relatórios** | Gráficos de vendas x lucro, produtos top, clientes top, formas de pagamento |

---

## 💬 Lembretes via WhatsApp

O sistema gera automaticamente links de WhatsApp para cobranças. Ao clicar em "Cobrar" ou "WhatsApp" em qualquer fiado ou alerta no dashboard, o app abre uma conversa no WhatsApp com a mensagem pré-preenchida.

Exemplo de mensagem automática:
> "Olá Maria! Lembramos que você tem um pagamento de R$ 85,00 na DS Produtos. Vencimento: 30/06/2025. Contamos com você! 😊"

---

## 🗄 Estrutura do Banco de Dados

```
clientes          → Cadastro de clientes
produtos          → Catálogo e estoque
vendas            → Registro de vendas
venda_itens       → Itens de cada venda
fiados            → Controle de dívidas
fiado_pagamentos  → Histórico de pagamentos dos fiados
transacoes        → Entradas e saídas financeiras
estoque_movimentos → Histórico do estoque
lembretes         → Registro de notificações
```

---

## 📞 Suporte

Desenvolvido para DS Produtos. Para dúvidas sobre configuração, consulte a documentação do [Supabase](https://supabase.com/docs) e [Vercel](https://vercel.com/docs).
