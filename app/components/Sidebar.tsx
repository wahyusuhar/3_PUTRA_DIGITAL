'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Home, Users, ShoppingCart, FileText, ClipboardList, Menu, X } from 'lucide-react';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

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
        w-64 lg:translate-x-0 flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-50 flex-shrink-0">
          <div>
            <h1 className="text-xl font-bold text-blue-600 leading-none">3 PUTRA</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Digital Store</p>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 text-gray-400 hover:text-red-500 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        {/* Navigation & Support - Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
          <nav className="space-y-1">
            {menu.map((item) => (
              <Link 
                key={item.name} 
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 p-3 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all group"
              >
                <item.icon size={20} className="group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-base">{item.name}</span>
              </Link>
            ))}
          </nav>

          <div className="pt-4 border-t border-gray-50">
            <div className="bg-blue-600 p-5 rounded-2xl text-white text-center shadow-lg shadow-blue-100">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Support</p>
              <p className="font-black text-base">Hubungi Prof</p>
            </div>
            <p className="text-[10px] text-center text-gray-300 mt-4 font-bold">Build Version 2.0.1</p>
          </div>
        </div>
      </div>
    </>
  );
}