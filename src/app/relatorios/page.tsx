'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const CORES = ['#059669', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function RelatoriosPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [vendasMeses, setVendasMeses] = useState<any[]>([])
  const [topProdutos, setTopProdutos] = useState<any[]>([])
  const [formasPag, setFormasPag] = useState<any[]>([])
  const [topClientes, setTopClientes] = useState<any[]>([])

  useEffect(() => {
    async function fetchAll() {
      const hoje = new Date()

      // Vendas dos últimos 6 meses
      const meses = Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(hoje, 5 - i)
        return { inicio: startOfMonth(d), fim: endOfMonth(d), label: format(d, 'MMM', { locale: ptBR }) }
      })

      const vendasPorMes = await Promise.all(meses.map(async m => {
        const { data } = await supabase
          .from('vendas')
          .select('total, lucro')
          .gte('data_venda', m.inicio.toISOString())
          .lte('data_venda', m.fim.toISOString())
          .neq('status', 'cancelado')
        const total = (data || []).reduce((s, v) => s + v.total, 0)
        const lucro = (data || []).reduce((s, v) => s + (v.lucro || 0), 0)
        return { mes: m.label, vendas: parseFloat(total.toFixed(2)), lucro: parseFloat(lucro.toFixed(2)) }
      }))
      setVendasMeses(vendasPorMes)

      // Top produtos vendidos (último mês)
      const inicioMes = startOfMonth(hoje).toISOString()
      const { data: itens } = await supabase
        .from('venda_itens')
        .select('quantidade, produto:produtos(nome)')
        .gte('created_at', inicioMes)

      const agrupado: any = {}
      ;(itens || []).forEach((i: any) => {
        const nome = i.produto?.nome || 'Desconhecido'
        agrupado[nome] = (agrupado[nome] || 0) + i.quantidade
      })
      const top = Object.entries(agrupado)
        .map(([nome, qtd]) => ({ nome, qtd }))
        .sort((a: any, b: any) => b.qtd - a.qtd)
        .slice(0, 6)
      setTopProdutos(top)

      // Formas de pagamento
      const { data: vendasMes } = await supabase
        .from('vendas')
        .select('forma_pagamento, total')
        .gte('data_venda', inicioMes)
        .neq('status', 'cancelado')

      const formas: any = { avista: 0, pix: 0, cartao: 0, fiado: 0 }
      ;(vendasMes || []).forEach((v: any) => {
        formas[v.forma_pagamento] = (formas[v.forma_pagamento] || 0) + v.total
      })
      setFormasPag(Object.entries(formas).map(([name, value]) => ({
        name: name === 'avista' ? 'À Vista' : name === 'pix' ? 'PIX' : name === 'cartao' ? 'Cartão' : 'Fiado',
        value: parseFloat((value as number).toFixed(2))
      })).filter(f => f.value > 0))

      // Top clientes
      const { data: vendasClientes } = await supabase
        .from('vendas')
        .select('total, cliente:clientes(nome)')
        .gte('data_venda', inicioMes)
        .not('cliente_id', 'is', null)
        .neq('status', 'cancelado')

      const porCliente: any = {}
      ;(vendasClientes || []).forEach((v: any) => {
        const nome = v.cliente?.nome || 'Anônimo'
        porCliente[nome] = (porCliente[nome] || 0) + v.total
      })
      const topC = Object.entries(porCliente)
        .map(([nome, total]) => ({ nome, total: parseFloat((total as number).toFixed(2)) }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
      setTopClientes(topC)

      setLoading(false)
    }
    fetchAll()
  }, [])

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Relatórios</h1>

      {/* Vendas x Lucro por mês */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Vendas e Lucro — Últimos 6 Meses</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={vendasMeses}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: any) => fmt(v)} />
            <Legend />
            <Bar dataKey="vendas" name="Vendas" fill="#059669" radius={[4, 4, 0, 0]} />
            <Bar dataKey="lucro" name="Lucro" fill="#34d399" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Formas de pagamento */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Formas de Pagamento (Mês Atual)</h2>
          {formasPag.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={formasPag} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {formasPag.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-400 py-10">Sem dados neste mês</p>
          )}
        </div>

        {/* Top clientes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Top 5 Clientes (Mês Atual)</h2>
          {topClientes.length > 0 ? (
            <div className="space-y-3">
              {topClientes.map((c, i) => {
                const max = topClientes[0].total
                return (
                  <div key={c.nome}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                        {c.nome}
                      </span>
                      <span className="font-semibold">{fmt(c.total)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(c.total / max) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-10">Sem dados neste mês</p>
          )}
        </div>
      </div>

      {/* Top produtos */}
      {topProdutos.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Produtos Mais Vendidos (Mês Atual)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topProdutos} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="nome" type="category" tick={{ fontSize: 12 }} width={160} />
              <Tooltip />
              <Bar dataKey="qtd" name="Unidades" fill="#059669" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
