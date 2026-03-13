'use client';

import React, { useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Lock, Mail, Loader2, LogIn, Store } from 'lucide-react';
import { useNotification } from '@/app/components/NotificationProvider';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast, playSound } = useNotification();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        showToast(error.message, 'error');
      } else {
        playSound('login');
        showToast('Berhasil Login!', 'success');
      }
    } catch (error: any) {
      showToast('Terjadi kesalahan saat login', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative overflow-hidden">
      {loading && (
        <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-500">
           <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-8 h-8 bg-blue-600 rounded-lg animate-pulse"></div>
              </div>
           </div>
           <p className="mt-6 text-sm font-black text-blue-900 tracking-[0.2em] animate-pulse">MEMPROSES AKSES...</p>
        </div>
      )}
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-100/40 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-100/40 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo Section */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-200 mb-4 scale-100">
             <Store size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tighter">3 PUTRA DIGITAL</h1>
          <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[8px] mt-1">Solusi Catat Hutang & Kasir</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-[2rem] shadow-2xl p-6 lg:p-8 border border-gray-100 relative">
          <div className="mb-6">
            <h2 className="text-xl font-black text-gray-800">Selamat Datang</h2>
            <p className="text-gray-500 font-medium text-xs mt-1">Silakan masuk ke akun admin Anda.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  placeholder="admin@example.com"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm text-gray-700 placeholder:text-gray-300"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm text-gray-700 placeholder:text-gray-300"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-black shadow-lg shadow-blue-100 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 mt-2 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Masuk...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Masuk Sekarang
                </>
              )}
            </button>
          </form>

          <p className="text-center text-gray-400 text-[9px] font-bold mt-6 uppercase tracking-widest">
            Terbatas untuk Akses Admin Toko
          </p>
        </div>

        {/* Footer info */}
        <p className="text-center text-gray-300 text-[10px] font-bold mt-10 uppercase tracking-[0.3em]">
          Powered by Mas Wahyu Suhardiyono
        </p>
      </div>
    </div>
  );
}
