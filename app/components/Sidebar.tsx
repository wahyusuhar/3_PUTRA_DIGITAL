'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, ShoppingCart, FileText, ClipboardList, Menu, X, LogOut } from 'lucide-react';
import { useAuth } from './AuthProvider';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { signOut } = useAuth();
  const pathname = usePathname();

  const menu = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Pelanggan', href: '/pelanggan', icon: Users },
    { name: 'Rekapan Hutang', href: '/hutang', icon: ClipboardList },
    { name: 'Rekapan Transaksi', href: '/laporan', icon: FileText },
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-3 bg-white shadow-lg rounded-2xl border border-gray-100 text-blue-600"
      >
        <Menu size={24} />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed left-0 top-0 h-screen bg-white shadow-2xl z-50 transition-all duration-300 ease-in-out
        w-60 lg:translate-x-0 flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-50 flex-shrink-0">
          <div>
            <h1 className="text-lg font-bold text-blue-600 leading-none">TOKO 3 PUTRA</h1>
            <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Digital Store BU SITI</p>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden p-1.5 text-gray-400 hover:text-red-500 transition-colors">
            <X size={18} />
          </button>
        </div>
        
        {/* Navigation & Support - Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
          <nav className="space-y-0.5">
            {menu.map((item) => (
              <Link 
                key={item.name} 
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-2.5 p-2 rounded-lg transition-all group ${
                  pathname === item.href 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                  : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                <item.icon size={18} className={`${pathname === item.href ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
                <span className="font-bold text-sm">{item.name}</span>
              </Link>
            ))}
          </nav>

          <div className="pt-3 border-t border-gray-50 flex flex-col gap-1.5">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 mb-1">
              <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 opacity-60">Created by</p>
              <p className="font-bold text-[10px] text-gray-600">Mas Wahyu Suhardiyono</p>
            </div>
            
            <button 
              onClick={() => {
                setIsOpen(false);
                signOut();
              }}
              className="flex items-center gap-2.5 p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all font-black text-xs w-full group"
            >
              <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
              Keluar Akun
            </button>

            <p className="text-[8px] text-center text-gray-300 mt-1 font-bold">Ver 2.0.2</p>
          </div>
        </div>
      </div>
    </>
  );
}