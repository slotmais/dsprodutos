'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Cliente } from '@/types'
import { Search, Plus, Phone, MapPin, AlertCircle, X, Save } from 'lucide-react'

const EMPTY: Omit<Cliente, 'id' | 'criado_em' | 'atualizado_em'> = {
  nome: '', telefone: '', whatsapp: '', endereco: '', bairro: '', cidade: '', observacoes: '', ativo: true
}

export default function ClientesPage() {
  const supabase = createClient()
  const [clientes, setClientes] = useState<any[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function fetchClientes() {
    const { data } = await supabase
      .from('clientes')
      .select(`*, fiados(valor_restante, status)`)
      .eq('ativo', true)
      .order('nome')
    setClientes(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchClientes() }, [])

  const filtrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone?.includes(busca) ||
    c.bairro?.toLowerCase().includes(busca.toLowerCase())
  )

  function openNovo() {
    setForm(EMPTY)
    setEditId(null)
    setModal(true)
  }

  function openEdit(c: any) {
    setForm({ ...c })
    setEditId(c.id)
    setModal(true)
  }

  async function salvar() {
    setSaving(true)
    const payload = {
      nome: form.nome, telefone: form.telefone, whatsapp: form.whatsapp,
      endereco: form.endereco, bairro: form.bairro, cidade: form.cidade,
      observacoes: form.observacoes, ativo: true,
      atualizado_em: new Date().toISOString()
    }
    if (editId) {
      await supabase.from('clientes').update(payload).eq('id', editId)
    } else {
      await supabase.from('clientes').insert(payload)
    }
    setSaving(false)
    setModal(false)
    fetchClientes()
  }

  async function inativar(id: string) {
    if (!confirm('Inativar este cliente?')) return
    await supabase.from('clientes').update({ ativo: false }).eq('id', id)
    fetchClientes()
  }

  const divida = (c: any) =>
    (c.fiados || [])
      .filter((f: any) => f.status !== 'pago')
      .reduce((s: number, f: any) => s + (f.valor_restante || 0), 0)

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
        <button onClick={openNovo}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
          <Plus size={16} /> Novo Cliente
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nome, telefone ou bairro..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-3">
          {filtrados.map(c => {
            const d = divida(c)
            return (
              <div key={c.id}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0">
                  {c.nome.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{c.nome}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                    {c.telefone && <span className="flex items-center gap-1"><Phone size={11} />{c.telefone}</span>}
                    {c.bairro && <span className="flex items-center gap-1"><MapPin size={11} />{c.bairro}</span>}
                  </div>
                </div>
                {d > 0 && (
                  <div className="flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-semibold">
                    <AlertCircle size={12} /> {fmt(d)}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => openEdit(c)}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    Editar
                  </button>
                  <button onClick={() => inativar(c.id)}
                    className="px-3 py-1.5 text-xs border border-red-100 text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                    Remover
                  </button>
                </div>
              </div>
            )
          })}
          {filtrados.length === 0 && (
            <p className="text-center text-gray-400 py-12">Nenhum cliente encontrado.</p>
          )}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-semibold text-gray-800">{editId ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={() => setModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              {[
                ['nome', 'Nome completo *', 'text'],
                ['telefone', 'Telefone', 'text'],
                ['whatsapp', 'WhatsApp', 'text'],
                ['endereco', 'Endereço', 'text'],
                ['bairro', 'Bairro', 'text'],
                ['cidade', 'Cidade', 'text'],
              ].map(([field, label, type]) => (
                <div key={field}>
                  <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                  <input
                    type={type}
                    value={form[field] || ''}
                    onChange={e => setForm({ ...form, [field]: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Observações</label>
                <textarea
                  value={form.observacoes || ''}
                  onChange={e => setForm({ ...form, observacoes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={() => setModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={salvar} disabled={saving || !form.nome}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
                <Save size={14} /> {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
