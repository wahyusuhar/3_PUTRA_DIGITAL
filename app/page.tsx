'use client';

import { useEffect, useState } from 'react';
import { Users, AlertCircle, TrendingUp } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalPiutang: 0,
    totalPelanggan: 0,
    transaksiHariIni: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    // 1. Total Pelanggan & Total Piutang (sum of total_hutang_saat_ini)
    const { data: pelangganData } = await supabase
      .from('pelanggan')
      .select('total_hutang_saat_ini');
    
    const totalPiutang = pelangganData?.reduce((acc, p) => acc + (Number(p.total_hutang_saat_ini) || 0), 0) || 0;
    const totalPelanggan = pelangganData?.length || 0;

    // 2. Transaksi Hari Ini (sum of total_harga for today)
    const today = new Date().toISOString().split('T')[0];
    const { data: transData } = await supabase
      .from('transaksi')
      .select('total_harga')
      .eq('tanggal_transaksi', today)
      .eq('tipe_transaksi', 'TUNAI'); // Only count cash as income for today?
    
    const transaksiHariIni = transData?.reduce((acc, t) => acc + (Number(t.total_harga) || 0), 0) || 0;

    setStats({ totalPiutang, totalPelanggan, transaksiHariIni });
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col h-full min-h-[calc(100vh-80px)] landscape:min-h-0 landscape:h-auto">
      <header className="mb-4 md:mb-8 landscape:mb-2">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 landscape:text-xl">Selamat Datang, Bos! 👋</h2>
        <p className="text-sm md:text-base text-gray-500 landscape:text-xs">Berikut ringkasan tokomu hari ini.</p>
      </header>

      <div className="grid grid-cols-3 gap-2 md:gap-6 landscape:gap-2">
        {/* Kartu Total Hutang */}
        <div className="bg-white p-3 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden landscape:p-2 landscape:rounded-xl">
          <div className="z-10 relative">
            <p className="text-[9px] md:text-xs text-gray-500 font-bold uppercase tracking-widest opacity-70 landscape:text-[8px]">Total Piutang</p>
            <h3 className="text-base md:text-3xl font-black text-red-600 mt-1 md:mt-2 landscape:text-sm landscape:mt-0">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(stats.totalPiutang)}
            </h3>
          </div>
          <AlertCircle className="absolute -right-2 -bottom-2 md:-right-4 md:-bottom-4 text-red-50 opacity-30 md:opacity-50 landscape:w-10 landscape:h-10" size={60} />
        </div>

        {/* Kartu Pelanggan Aktif */}
        <div className="bg-white p-3 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden landscape:p-2 landscape:rounded-xl">
          <div className="z-10 relative">
            <p className="text-[9px] md:text-xs text-gray-500 font-bold uppercase tracking-widest opacity-70 landscape:text-[8px]">Pelanggan</p>
            <h3 className="text-base md:text-3xl font-black text-blue-600 mt-1 md:mt-2 landscape:text-sm landscape:mt-0">{stats.totalPelanggan} <span className="text-[10px] md:text-base opacity-60">P</span></h3>
          </div>
          <Users className="absolute -right-2 -bottom-2 md:-right-4 md:-bottom-4 text-blue-50 opacity-30 md:opacity-50 landscape:w-10 landscape:h-10" size={60} />
        </div>

        {/* Kartu Transaksi Hari Ini */}
        <div className="bg-white p-3 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden landscape:p-2 landscape:rounded-xl">
          <div className="z-10 relative">
            <p className="text-[9px] md:text-xs text-gray-500 font-bold uppercase tracking-widest opacity-70 landscape:text-[8px]">Tunai Hari Ini</p>
            <h3 className="text-base md:text-3xl font-black text-green-600 mt-1 md:mt-2 landscape:text-sm landscape:mt-0">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(stats.transaksiHariIni)}
            </h3>
          </div>
          <TrendingUp className="absolute -right-2 -bottom-2 md:-right-4 md:-bottom-4 text-green-50 opacity-30 md:opacity-50 landscape:w-10 landscape:h-10" size={60} />
        </div>
      </div>
    </div>
  );
}