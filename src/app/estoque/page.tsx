'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, Package, AlertTriangle, X, Save } from 'lucide-react'

const EMPTY_PRODUTO = {
  nome: '', descricao: '', preco_custo: '', preco_venda: '',
  unidade: 'un', estoque_atual: '', estoque_minimo: '5'
}

export default function EstoquePage() {
  const supabase = createClient()
  const [produtos, setProdutos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [modalAjuste, setModalAjuste] = useState<any>(null)
  const [form, setForm] = useState<any>(EMPTY_PRODUTO)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [qtdAjuste, setQtdAjuste] = useState('')
  const [tipoAjuste, setTipoAjuste] = useState<'entrada' | 'ajuste'>('entrada')

  async function fetchProdutos() {
    const { data } = await supabase
      .from('produtos')
      .select('*')
      .eq('ativo', true)
      .order('nome')
    setProdutos(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchProdutos() }, [])

  function openEdit(p: any) {
    setForm({ ...p, preco_custo: p.preco_custo.toString(), preco_venda: p.preco_venda.toString(), estoque_atual: p.estoque_atual.toString(), estoque_minimo: p.estoque_minimo.toString() })
    setEditId(p.id)
    setModal(true)
  }

  async function salvar() {
    setSaving(true)
    const payload = {
      nome: form.nome,
      descricao: form.descricao,
      preco_custo: Number(form.preco_custo),
      preco_venda: Number(form.preco_venda),
      unidade: form.unidade,
      estoque_atual: Number(form.estoque_atual),
      estoque_minimo: Number(form.estoque_minimo),
      atualizado_em: new Date().toISOString()
    }
    if (editId) {
      await supabase.from('produtos').update(payload).eq('id', editId)
    } else {
      await supabase.from('produtos').insert({ ...payload, ativo: true })
    }
    setSaving(false)
    setModal(false)
    setForm(EMPTY_PRODUTO)
    setEditId(null)
    fetchProdutos()
  }

  async function ajustarEstoque() {
    if (!qtdAjuste || Number(qtdAjuste) <= 0) return
    setSaving(true)
    const novoEstoque = tipoAjuste === 'entrada'
      ? modalAjuste.estoque_atual + Number(qtdAjuste)
      : Number(qtdAjuste)

    await supabase.from('produtos').update({ estoque_atual: novoEstoque, atualizado_em: new Date().toISOString() }).eq('id', modalAjuste.id)
    await supabase.from('estoque_movimentos').insert({
      produto_id: modalAjuste.id,
      tipo: tipoAjuste,
      quantidade: Number(qtdAjuste),
      motivo: tipoAjuste === 'entrada' ? 'Reposição' : 'Ajuste de inventário'
    })

    setSaving(false)
    setModalAjuste(null)
    setQtdAjuste('')
    fetchProdutos()
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const margem = (p: any) => p.preco_custo > 0
    ? Math.round(((p.preco_venda - p.preco_custo) / p.preco_custo) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Estoque</h1>
        <button onClick={() => { setForm(EMPTY_PRODUTO); setEditId(null); setModal(true) }}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
          <Plus size={16} /> Novo Produto
        </button>
      </div>

      {produtos.filter(p => p.estoque_atual <= p.estoque_minimo).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-amber-600 shrink-0" />
          <div>
            <p className="font-medium text-amber-800">Estoque baixo!</p>
            <p className="text-sm text-amber-600">
              {produtos.filter(p => p.estoque_atual <= p.estoque_minimo).map(p => p.nome).join(', ')} precisam de reposição.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-3">
          {produtos.map(p => {
            const baixo = p.estoque_atual <= p.estoque_minimo
            return (
              <div key={p.id} className={`bg-white rounded-2xl p-4 border shadow-sm ${baixo ? 'border-amber-200' : 'border-gray-100'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${baixo ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                    <Package size={18} className={baixo ? 'text-amber-600' : 'text-emerald-600'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800 truncate">{p.nome}</p>
                      {baixo && <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-lg font-medium shrink-0">Baixo</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-0.5 text-xs text-gray-400">
                      <span>Custo: {fmt(p.preco_custo)}</span>
                      <span>Venda: {fmt(p.preco_venda)}</span>
                      <span className="text-emerald-600 font-medium">Margem: {margem(p)}%</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xl font-bold ${baixo ? 'text-amber-600' : 'text-gray-800'}`}>{p.estoque_atual}</p>
                    <p className="text-xs text-gray-400">{p.unidade} · mín {p.estoque_minimo}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => { setModalAjuste(p); setTipoAjuste('entrada'); setQtdAjuste('') }}
                      className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors">
                      + Repor
                    </button>
                    <button onClick={() => openEdit(p)}
                      className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Produto */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
              <h2 className="font-semibold">{editId ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button onClick={() => setModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              {[['nome', 'Nome *'], ['descricao', 'Descrição']].map(([f, l]) => (
                <div key={f}>
                  <label className="text-xs text-gray-500 mb-1 block">{l}</label>
                  <input type="text" value={form[f] || ''} onChange={e => setForm({ ...form, [f]: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Preço de Custo *</label>
                  <input type="number" min="0" step="0.01" value={form.preco_custo} onChange={e => setForm({ ...form, preco_custo: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Preço de Venda *</label>
                  <input type="number" min="0" step="0.01" value={form.preco_venda} onChange={e => setForm({ ...form, preco_venda: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Unidade</label>
                  <select value={form.unidade} onChange={e => setForm({ ...form, unidade: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                    {['un', 'kg', 'L', 'cx', 'par', 'pct'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Estoque atual</label>
                  <input type="number" min="0" value={form.estoque_atual} onChange={e => setForm({ ...form, estoque_atual: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Mínimo</label>
                  <input type="number" min="0" value={form.estoque_minimo} onChange={e => setForm({ ...form, estoque_minimo: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={() => setModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={salvar} disabled={saving || !form.nome}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
                <Save size={14} />{saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajuste */}
      {modalAjuste && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-semibold">Ajustar Estoque</h2>
              <button onClick={() => setModalAjuste(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-3 text-sm">
                <p className="font-medium">{modalAjuste.nome}</p>
                <p className="text-gray-500">Estoque atual: <strong>{modalAjuste.estoque_atual} {modalAjuste.unidade}</strong></p>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setTipoAjuste('entrada')}
                    className={`py-2 rounded-xl text-sm border transition-all ${tipoAjuste === 'entrada' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-200'}`}>
                    + Entrada
                  </button>
                  <button onClick={() => setTipoAjuste('ajuste')}
                    className={`py-2 rounded-xl text-sm border transition-all ${tipoAjuste === 'ajuste' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200'}`}>
                    Ajustar total
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  {tipoAjuste === 'entrada' ? 'Quantidade a adicionar' : 'Novo total em estoque'}
                </label>
                <input type="number" min="0" value={qtdAjuste} onChange={e => setQtdAjuste(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={() => setModalAjuste(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={ajustarEstoque} disabled={saving || !qtdAjuste}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
                <Save size={14} />{saving ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
