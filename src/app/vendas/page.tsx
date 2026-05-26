'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, Search, X, Save, Trash2, ShoppingCart } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const FORMAS = [
  { value: 'avista', label: '💵 À Vista' },
  { value: 'pix', label: '📱 PIX' },
  { value: 'cartao', label: '💳 Cartão' },
  { value: 'fiado', label: '📝 Fiado' },
]

export default function VendasPage() {
  const supabase = createClient()
  const [vendas, setVendas] = useState<any[]>([])
  const [produtos, setProdutos] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const [clienteId, setClienteId] = useState('')
  const [forma, setForma] = useState('avista')
  const [vencimento, setVencimento] = useState('')
  const [desconto, setDesconto] = useState(0)
  const [obs, setObs] = useState('')
  const [itens, setItens] = useState<any[]>([])
  const [produtoSel, setProdutoSel] = useState('')
  const [qtd, setQtd] = useState(1)

  async function fetchVendas() {
    const { data } = await supabase
      .from('vendas')
      .select('*, cliente:clientes(nome), venda_itens(quantidade, preco_unitario, produto:produtos(nome))')
      .order('data_venda', { ascending: false })
      .limit(50)
    setVendas(data || [])
    setLoading(false)
  }

  async function fetchProdutos() {
    const { data } = await supabase.from('produtos').select('*').eq('ativo', true).order('nome')
    setProdutos(data || [])
  }

  async function fetchClientes() {
    const { data } = await supabase.from('clientes').select('id, nome, whatsapp').eq('ativo', true).order('nome')
    setClientes(data || [])
  }

  useEffect(() => {
    fetchVendas()
    fetchProdutos()
    fetchClientes()
  }, [])

  function addItem() {
    const p = produtos.find(p => p.id === produtoSel)
    if (!p || qtd <= 0) return
    const existing = itens.find(i => i.produto_id === produtoSel)
    if (existing) {
      setItens(itens.map(i =>
        i.produto_id === produtoSel
          ? { ...i, quantidade: i.quantidade + qtd, subtotal: (i.quantidade + qtd) * i.preco_unitario }
          : i
      ))
    } else {
      setItens([...itens, {
        produto_id: p.id,
        nome: p.nome,
        quantidade: qtd,
        preco_unitario: p.preco_venda,
        preco_custo_unitario: p.preco_custo,
        subtotal: qtd * p.preco_venda
      }])
    }
    setProdutoSel('')
    setQtd(1)
  }

  function removeItem(pid: string) {
    setItens(itens.filter(i => i.produto_id !== pid))
  }

  const totalBruto = itens.reduce((s, i) => s + i.subtotal, 0)
  const totalFinal = Math.max(totalBruto - desconto, 0)
  const totalCusto = itens.reduce((s, i) => s + i.preco_custo_unitario * i.quantidade, 0)
  const lucroVenda = totalFinal - totalCusto

  async function salvarVenda() {
    if (itens.length === 0) return alert('Adicione pelo menos um produto.')
    if (forma === 'fiado' && !clienteId) return alert('Selecione o cliente para venda fiada.')
    setSaving(true)

    const { data: venda, error } = await supabase.from('vendas').insert({
      cliente_id: clienteId || null,
      forma_pagamento: forma,
      status: forma === 'fiado' ? 'pendente' : 'pago',
      total: totalFinal,
      total_custo: totalCusto,
      lucro: lucroVenda,
      desconto,
      data_vencimento: forma === 'fiado' ? vencimento || null : null,
      observacoes: obs,
    }).select().single()

    if (!venda) { setSaving(false); return }

    await supabase.from('venda_itens').insert(
      itens.map(i => ({
        venda_id: venda.id,
        produto_id: i.produto_id,
        quantidade: i.quantidade,
        preco_unitario: i.preco_unitario,
        preco_custo_unitario: i.preco_custo_unitario,
        subtotal: i.subtotal,
      }))
    )

    if (forma === 'fiado' && clienteId) {
      await supabase.from('fiados').insert({
        venda_id: venda.id,
        cliente_id: clienteId,
        valor_total: totalFinal,
        valor_pago: 0,
        valor_restante: totalFinal,
        data_vencimento: vencimento || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        status: 'pendente',
      })
    }

    setSaving(false)
    setModal(false)
    resetForm()
    fetchVendas()
  }

  function resetForm() {
    setClienteId(''); setForma('avista'); setVencimento(''); setDesconto(0); setObs(''); setItens([])
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const STATUS_COLORS: any = {
    pago: 'bg-green-100 text-green-700',
    pendente: 'bg-amber-100 text-amber-700',
    atrasado: 'bg-red-100 text-red-700',
    cancelado: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Vendas</h1>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
          <Plus size={16} /> Nova Venda
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Data</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Forma</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Total</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Lucro</th>
              </tr>
            </thead>
            <tbody>
              {vendas.map(v => (
                <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500">
                    {format(new Date(v.data_venda), 'dd/MM HH:mm')}
                  </td>
                  <td className="px-4 py-3 font-medium">{v.cliente?.nome || '—'}</td>
                  <td className="px-4 py-3 capitalize">{v.forma_pagamento}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[v.status]}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{fmt(v.total)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600 font-semibold">{fmt(v.lucro || 0)}</td>
                </tr>
              ))}
              {vendas.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Nenhuma venda registrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <ShoppingCart size={18} className="text-emerald-600" /> Nova Venda
              </h2>
              <button onClick={() => { setModal(false); resetForm() }}><X size={20} className="text-gray-400" /></button>
            </div>

            <div className="p-5 space-y-4">
              {/* Cliente */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Cliente</label>
                <select value={clienteId} onChange={e => setClienteId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                  <option value="">Selecionar cliente (opcional)</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              {/* Forma de pagamento */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Forma de pagamento</label>
                <div className="grid grid-cols-4 gap-2">
                  {FORMAS.map(f => (
                    <button key={f.value} onClick={() => setForma(f.value)}
                      className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                        forma === f.value
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'border-gray-200 hover:border-emerald-300'
                      }`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {forma === 'fiado' && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Data de vencimento</label>
                  <input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              )}

              {/* Adicionar produto */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Adicionar produto</label>
                <div className="flex gap-2">
                  <select value={produtoSel} onChange={e => setProdutoSel(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                    <option value="">Selecionar produto...</option>
                    {produtos.map(p => (
                      <option key={p.id} value={p.id}>{p.nome} — {fmt(p.preco_venda)}</option>
                    ))}
                  </select>
                  <input type="number" min="1" value={qtd} onChange={e => setQtd(Number(e.target.value))}
                    className="w-20 px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  <button onClick={addItem}
                    className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700 transition-colors">
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Lista de itens */}
              {itens.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  {itens.map(item => (
                    <div key={item.produto_id} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-100">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.nome}</p>
                        <p className="text-xs text-gray-400">{item.quantidade} × {fmt(item.preco_unitario)}</p>
                      </div>
                      <p className="font-semibold text-sm">{fmt(item.subtotal)}</p>
                      <button onClick={() => removeItem(item.produto_id)}>
                        <Trash2 size={14} className="text-red-400 hover:text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Desconto */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Desconto (R$)</label>
                <input type="number" min="0" value={desconto} onChange={e => setDesconto(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>

              {/* Totais */}
              {itens.length > 0 && (
                <div className="bg-emerald-50 rounded-xl p-4 space-y-1.5">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span><span>{fmt(totalBruto)}</span>
                  </div>
                  {desconto > 0 && (
                    <div className="flex justify-between text-sm text-red-500">
                      <span>Desconto</span><span>- {fmt(desconto)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-gray-800 pt-1 border-t border-emerald-100">
                    <span>Total</span><span>{fmt(totalFinal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Lucro estimado</span><span>{fmt(lucroVenda)}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Observações</label>
                <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t sticky bottom-0 bg-white">
              <button onClick={() => { setModal(false); resetForm() }}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={salvarVenda} disabled={saving || itens.length === 0}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
                <Save size={14} /> {saving ? 'Salvando...' : 'Registrar Venda'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
