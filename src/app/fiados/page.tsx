'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { AlertCircle, CheckCircle, Clock, MessageCircle, DollarSign, X, Save } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function FiadosPage() {
  const supabase = createClient()
  const [fiados, setFiados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'todos' | 'pendente' | 'atrasado' | 'parcial' | 'pago'>('todos')
  const [modalPagamento, setModalPagamento] = useState<any>(null)
  const [valorPag, setValorPag] = useState('')
  const [formaPag, setFormaPag] = useState('dinheiro')
  const [saving, setSaving] = useState(false)

  async function fetchFiados() {
    const { data } = await supabase
      .from('fiados')
      .select('*, cliente:clientes(nome, whatsapp, telefone)')
      .order('data_vencimento')
    setFiados(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchFiados() }, [])

  const filtrados = filtro === 'todos' ? fiados : fiados.filter(f => f.status === filtro)

  async function registrarPagamento() {
    if (!valorPag || Number(valorPag) <= 0) return
    setSaving(true)
    await supabase.from('fiado_pagamentos').insert({
      fiado_id: modalPagamento.id,
      valor: Number(valorPag),
      forma_pagamento: formaPag,
    })
    setSaving(false)
    setModalPagamento(null)
    setValorPag('')
    fetchFiados()
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const STATUS_CONFIG: any = {
    pendente: { color: 'bg-amber-100 text-amber-700', icon: Clock, label: 'Pendente' },
    atrasado: { color: 'bg-red-100 text-red-700', icon: AlertCircle, label: 'Atrasado' },
    parcial: { color: 'bg-blue-100 text-blue-700', icon: DollarSign, label: 'Parcial' },
    pago: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Pago' },
  }

  const totais = fiados.reduce((acc, f) => {
    if (f.status !== 'pago') acc.aberto += f.valor_restante || 0
    if (f.status === 'atrasado') acc.atrasado += f.valor_restante || 0
    return acc
  }, { aberto: 0, atrasado: 0 })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Fiados e Dívidas</h1>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-amber-600 text-sm">Total em Aberto</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{fmt(totais.aberto)}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
          <p className="text-red-600 text-sm">Total Atrasado</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{fmt(totais.atrasado)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['todos', 'pendente', 'atrasado', 'parcial', 'pago'] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              filtro === f ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {f === 'todos' ? 'Todos' : STATUS_CONFIG[f]?.label}
            <span className="ml-1.5 text-xs opacity-70">
              ({filtro === 'todos' && f === 'todos' ? fiados.length : fiados.filter(x => x.status === f).length})
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(f => {
            const cfg = STATUS_CONFIG[f.status] || STATUS_CONFIG.pendente
            const StatusIcon = cfg.icon
            const vencimento = new Date(f.data_vencimento + 'T12:00:00')
            const atrasado = isPast(vencimento) && f.status !== 'pago'
            const venceHoje = isToday(vencimento)
            const pct = f.valor_total > 0 ? Math.round((f.valor_pago / f.valor_total) * 100) : 0

            return (
              <div key={f.id} className={`bg-white rounded-2xl p-4 border shadow-sm ${
                atrasado && f.status !== 'pago' ? 'border-red-200' : 'border-gray-100'
              }`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0">
                    {f.cliente?.nome?.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-gray-800 truncate">{f.cliente?.nome}</p>
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-medium shrink-0 ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                      <span>Vence: {format(vencimento, 'dd/MM/yyyy', { locale: ptBR })}</span>
                      {venceHoje && <span className="text-amber-500 font-medium">⚠ Vence hoje!</span>}
                      {atrasado && f.status !== 'pago' && <span className="text-red-500 font-medium">⚠ Atrasado</span>}
                    </div>

                    {/* Barra de progresso */}
                    {f.status !== 'pago' && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Pago: {fmt(f.valor_pago || 0)}</span>
                          <span>Restante: {fmt(f.valor_restante || f.valor_total)}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mt-3">
                      {f.status !== 'pago' && (
                        <button onClick={() => setModalPagamento(f)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors">
                          <DollarSign size={12} /> Receber
                        </button>
                      )}
                      {f.cliente?.whatsapp && f.status !== 'pago' && (
                        <a
                          href={`https://wa.me/55${f.cliente.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Olá ${f.cliente.nome}! Lembramos que você tem um pagamento de ${fmt(f.valor_restante)} na DS Produtos. Vencimento: ${format(vencimento, 'dd/MM/yyyy')}. Contamos com você! 😊`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-colors">
                          <MessageCircle size={12} /> Cobrar
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-lg text-gray-800">{fmt(f.valor_restante || f.valor_total)}</p>
                    <p className="text-xs text-gray-400">de {fmt(f.valor_total)}</p>
                  </div>
                </div>
              </div>
            )
          })}
          {filtrados.length === 0 && (
            <p className="text-center text-gray-400 py-12">Nenhum fiado encontrado.</p>
          )}
        </div>
      )}

      {/* Modal de pagamento */}
      {modalPagamento && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-semibold">Registrar Pagamento</h2>
              <button onClick={() => setModalPagamento(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-3 text-sm">
                <p className="font-medium text-gray-800">{modalPagamento.cliente?.nome}</p>
                <p className="text-gray-500 mt-0.5">Saldo devedor: <strong>{fmt(modalPagamento.valor_restante)}</strong></p>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Valor recebido (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={`Máx: ${(modalPagamento.valor_restante || 0).toFixed(2)}`}
                  value={valorPag}
                  onChange={e => setValorPag(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Forma de recebimento</label>
                <div className="grid grid-cols-3 gap-2">
                  {['dinheiro', 'pix', 'cartao'].map(fp => (
                    <button key={fp} onClick={() => setFormaPag(fp)}
                      className={`py-2 rounded-xl text-sm capitalize border transition-all ${
                        formaPag === fp ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-200'
                      }`}>
                      {fp}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={() => setModalPagamento(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={registrarPagamento} disabled={saving || !valorPag}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
                <Save size={14} /> {saving ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
