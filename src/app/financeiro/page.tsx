'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, TrendingUp, TrendingDown, X, Save } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const CATEGORIAS_SAIDA = ['Mercadoria', 'Combustível', 'Transporte', 'Embalagens', 'Outros']
const CATEGORIAS_ENTRADA = ['Recebimento de Fiado', 'Outros']

export default function FinanceiroPage() {
  const supabase = createClient()
  const [transacoes, setTransacoes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mes, setMes] = useState(format(new Date(), 'yyyy-MM'))
  const [form, setForm] = useState({
    tipo: 'saida', categoria: 'Mercadoria', descricao: '', valor: '', data_transacao: format(new Date(), 'yyyy-MM-dd')
  })

  async function fetchTransacoes() {
    const inicio = startOfMonth(new Date(mes + '-01'))
    const fim = endOfMonth(inicio)
    const { data } = await supabase
      .from('transacoes')
      .select('*')
      .gte('data_transacao', format(inicio, 'yyyy-MM-dd'))
      .lte('data_transacao', format(fim, 'yyyy-MM-dd'))
      .order('data_transacao', { ascending: false })
    setTransacoes(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchTransacoes() }, [mes])

  async function salvar() {
    if (!form.valor || Number(form.valor) <= 0) return
    setSaving(true)
    await supabase.from('transacoes').insert({
      tipo: form.tipo,
      categoria: form.categoria,
      descricao: form.descricao,
      valor: Number(form.valor),
      data_transacao: form.data_transacao,
    })
    setSaving(false)
    setModal(false)
    fetchTransacoes()
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const totalEntradas = transacoes.filter(t => t.tipo === 'entrada').reduce((s, t) => s + t.valor, 0)
  const totalSaidas = transacoes.filter(t => t.tipo === 'saida').reduce((s, t) => s + t.valor, 0)
  const saldo = totalEntradas - totalSaidas

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Financeiro</h1>
        <div className="flex items-center gap-3">
          <input type="month" value={mes} onChange={e => setMes(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
            <Plus size={16} /> Lançamento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <TrendingUp size={16} /><span className="text-sm">Entradas</span>
          </div>
          <p className="text-xl font-bold text-green-700">{fmt(totalEntradas)}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <TrendingDown size={16} /><span className="text-sm">Saídas</span>
          </div>
          <p className="text-xl font-bold text-red-700">{fmt(totalSaidas)}</p>
        </div>
        <div className={`border rounded-2xl p-4 ${saldo >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
          <p className={`text-sm mb-1 ${saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Saldo</p>
          <p className={`text-xl font-bold ${saldo >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(saldo)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 rounded-full border-4 border-emerald-500 border-t-transparent" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Data</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Categoria</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Descrição</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {transacoes.map(t => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">
                    {format(new Date(t.data_transacao + 'T12:00:00'), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-4 py-3">{t.categoria}</td>
                  <td className="px-4 py-3 text-gray-500">{t.descricao || '—'}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${t.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.tipo === 'entrada' ? '+' : '-'}{fmt(t.valor)}
                  </td>
                </tr>
              ))}
              {transacoes.length === 0 && (
                <tr><td colSpan={4} className="text-center py-12 text-gray-400">Nenhum lançamento neste mês.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-semibold">Novo Lançamento</h2>
              <button onClick={() => setModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  {['entrada', 'saida'].map(t => (
                    <button key={t} onClick={() => setForm({ ...form, tipo: t, categoria: t === 'saida' ? 'Mercadoria' : 'Recebimento de Fiado' })}
                      className={`py-2.5 rounded-xl text-sm font-medium border capitalize transition-all ${
                        form.tipo === t
                          ? t === 'entrada' ? 'bg-green-600 text-white border-green-600' : 'bg-red-500 text-white border-red-500'
                          : 'border-gray-200'
                      }`}>
                      {t === 'entrada' ? '+ Entrada' : '- Saída'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Categoria</label>
                <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                  {(form.tipo === 'saida' ? CATEGORIAS_SAIDA : CATEGORIAS_ENTRADA).map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Descrição</label>
                <input type="text" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Valor (R$) *</label>
                <input type="number" min="0" step="0.01" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Data</label>
                <input type="date" value={form.data_transacao} onChange={e => setForm({ ...form, data_transacao: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={() => setModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={salvar} disabled={saving || !form.valor}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
                <Save size={14} />{saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
