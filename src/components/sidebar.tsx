'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, ShoppingCart, DollarSign,
  AlertCircle, Package, BarChart3, Menu, X, Bell
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/vendas', label: 'Vendas', icon: ShoppingCart },
  { href: '/financeiro', label: 'Financeiro', icon: DollarSign },
  { href: '/fiados', label: 'Fiados', icon: AlertCircle },
  { href: '/estoque', label: 'Estoque', icon: Package },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
]

export function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-emerald-800 text-white rounded-lg"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-emerald-900 text-white z-40
        transform transition-transform duration-300 lg:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-emerald-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-400 rounded-xl flex items-center justify-center">
              <Package size={20} className="text-emerald-900" />
            </div>
            <div>
              <p className="font-bold text-lg leading-none">DS Produtos</p>
              <p className="text-emerald-300 text-xs mt-0.5">Gestão de Vendas</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                transition-all duration-200
                ${pathname === href
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'text-emerald-100 hover:bg-emerald-800'
                }
              `}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-emerald-700">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-800">
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-sm font-bold">
              DS
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">DS Produtos</p>
              <p className="text-xs text-emerald-300">Vendedor</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
