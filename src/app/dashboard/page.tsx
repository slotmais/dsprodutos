'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  DollarSign, Users, AlertCircle, TrendingUp,
  ShoppingCart, Package, Bell, Clock
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line
} from 'recharts'
import { format, startOfDay, endOfDay, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function StatCard({
  icon: Icon, label, value, color, sub
}: {
  icon: any, label: string, value: string, color: string, sub?: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-sm">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
          <Icon size={20} className={color} />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    vendas_hoje: 0,
    recebido_hoje: 0,
    fiados_aberto: 0,
    lucro_mes: 0,
    clientes_total: 0,
    inadimplentes: 0,
    vencendo_hoje: 0,
    estoque_baixo: 0,
  })
  const [vendasSemana, setVendasSemana] = useState<any[]>([])
  const [produtosMaisVendidos, setProdutosMaisVendidos] = useState<any[]>([])
  const [fiadosVencendo, setFiadosVencendo] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      const hoje = new Date()
      const inicioHoje = startOfDay(hoje).toISOString()
      const fimHoje = endOfDay(hoje).toISOString()
      const inicioMes = startOfMonth(hoje).toISOString()

      const [vendasHoje, fiadosAbertos, clientesTotal, estoqueBaixo, fiadosHoje] =
        await Promise.all([
          supabase.from('vendas')
            .select('total, lucro, forma_pagamento')
            .gte('data_venda', inicioHoje)
            .lte('data_venda', fimHoje)
            .neq('status', 'cancelado'),

          supabase.from('fiados')
            .select('valor_restante, status, data_vencimento, cliente:clientes(nome, whatsapp)')
            .neq('status', 'pago')
            .order('data_vencimento'),

          supabase.from('clientes').select('id', { count: 'exact' }).eq('ativo', true),

          supabase.from('produtos')
            .select('id', { count: 'exact' })
            .filter('estoque_atual', 'lte', 'estoque_minimo'),

          supabase.from('fiados')
            .select('*, cliente:clientes(nome, whatsapp)')
            .eq('data_vencimento', format(hoje, 'yyyy-MM-dd'))
            .neq('status', 'pago'),
        ])

      const vendasData = vendasHoje.data || []
      const totalVendasHoje = vendasData.reduce((s: number, v: any) => s + v.total, 0)
      const recebidoHoje = vendasData
        .filter((v: any) => ['avista', 'pix', 'cartao'].includes(v.forma_pagamento))
        .reduce((s: number, v: any) => s + v.total, 0)

      const fiadosData = fiadosAbertos.data || []
      const totalFiados = fiadosData.reduce((s: number, f: any) => s + (f.valor_restante || 0), 0)
      const inadimplentes = fiadosData.filter((f: any) => f.status === 'atrasado').length

      // Lucro do mês
      const { data: vendasMes } = await supabase
        .from('vendas')
        .select('lucro')
        .gte('data_venda', inicioMes)
        .neq('status', 'cancelado')

      const lucroMes = (vendasMes || []).reduce((s: number, v: any) => s + (v.lucro || 0), 0)

      setStats({
        vendas_hoje: totalVendasHoje,
        recebido_hoje: recebidoHoje,
        fiados_aberto: totalFiados,
        lucro_mes: lucroMes,
        clientes_total: clientesTotal.count || 0,
        inadimplentes,
        vencendo_hoje: fiadosHoje.data?.length || 0,
        estoque_baixo: estoqueBaixo.count || 0,
      })

      setFiadosVencendo(fiadosHoje.data || [])
      setLoading(false)
    }

    fetchData()
  }, [])

  const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        {stats.vencendo_hoje > 0 && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 px-4 py-2 rounded-xl text-sm font-medium">
            <Bell size={16} />
            {stats.vencendo_hoje} vencimento(s) hoje
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={ShoppingCart}
          label="Vendas Hoje"
          value={fmt(stats.vendas_hoje)}
          color="text-emerald-600"
          sub="Total faturado"
        />
        <StatCard
          icon={DollarSign}
          label="Recebido Hoje"
          value={fmt(stats.recebido_hoje)}
          color="text-blue-600"
          sub="À vista + PIX + Cartão"
        />
        <StatCard
          icon={AlertCircle}
          label="Total Fiados"
          value={fmt(stats.fiados_aberto)}
          color="text-amber-600"
          sub={`${stats.inadimplentes} clientes atrasados`}
        />
        <StatCard
          icon={TrendingUp}
          label="Lucro do Mês"
          value={fmt(stats.lucro_mes)}
          color="text-emerald-600"
          sub="Receita - Custo"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Clientes Ativos"
          value={stats.clientes_total.toString()}
          color="text-purple-600"
        />
        <StatCard
          icon={AlertCircle}
          label="Inadimplentes"
          value={stats.inadimplentes.toString()}
          color="text-red-600"
          sub="Pagamentos atrasados"
        />
        <StatCard
          icon={Clock}
          label="Vencem Hoje"
          value={stats.vencendo_hoje.toString()}
          color="text-orange-600"
          sub="Envie lembretes!"
        />
        <StatCard
          icon={Package}
          label="Estoque Baixo"
          value={stats.estoque_baixo.toString()}
          color="text-gray-600"
          sub="Produtos a repor"
        />
      </div>

      {/* Alertas de vencimento */}
      {fiadosVencendo.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h2 className="font-semibold text-amber-800 flex items-center gap-2 mb-3">
            <Bell size={18} /> Vencimentos de Hoje — Envie o Lembrete!
          </h2>
          <div className="space-y-2">
            {fiadosVencendo.map((f: any) => (
              <div key={f.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-amber-100">
                <div>
                  <p className="font-medium text-gray-800">{f.cliente?.nome}</p>
                  <p className="text-sm text-gray-500">
                    Deve: {fmt(f.valor_restante)}
                  </p>
                </div>
                <a
                  href={`https://wa.me/55${f.cliente?.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Olá ${f.cliente?.nome}! 👋 Lembramos que seu pagamento da DS Produtos vence hoje. Valor: ${fmt(f.valor_restante)}. Qualquer dúvida, estamos à disposição!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-600 transition-colors"
                >
                  WhatsApp
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
