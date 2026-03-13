'use client';

import { useEffect, useState } from 'react';
import { Users, AlertCircle, TrendingUp, Wallet, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

interface ChartData {
  tanggal: string;
  total: number;
  formattedDate: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalPiutang: 0,
    totalPelanggan: 0,
    transaksiHariIni: 0
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loadingChart, setLoadingChart] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchChartData();
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
      .eq('tipe_transaksi', 'TUNAI'); 
    
    const transaksiHariIni = transData?.reduce((acc, t) => acc + (Number(t.total_harga) || 0), 0) || 0;

    setStats({ totalPiutang, totalPelanggan, transaksiHariIni });
  }

  async function fetchChartData() {
    setLoadingChart(true);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    // Fetch transactions that are debt payments (TUNAI with specific keywords)
    const { data, error } = await supabase
      .from('transaksi')
      .select('total_harga, tanggal_transaksi')
      .eq('tipe_transaksi', 'TUNAI')
      .or('catatan_barang.ilike.%Bayar Hutang%,catatan_barang.ilike.%Pembayaran Hutang%')
      .gte('tanggal_transaksi', dateStr)
      .order('tanggal_transaksi', { ascending: true });

    if (!error && data) {
      // Group by date
      const grouped = data.reduce((acc: any, curr) => {
        const date = curr.tanggal_transaksi;
        if (!acc[date]) acc[date] = 0;
        acc[date] += Number(curr.total_harga);
        return acc;
      }, {});

      // Fill missing dates in the last 30 days with 0
      const formattedData: ChartData[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().split('T')[0];
        const displayDate = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        
        formattedData.push({
          tanggal: iso,
          total: grouped[iso] || 0,
          formattedDate: displayDate
        });
      }
      setChartData(formattedData);
    }
    setLoadingChart(false);
  }

  return (
    <div className="p-4 md:p-6 w-full flex flex-col h-full min-h-screen lg:h-screen overflow-y-auto lg:overflow-hidden lg:p-4 gap-4 md:gap-6">
      <header className="flex flex-col gap-0.5">
        <h2 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">
          Selamat Datang, Bos! 👋
        </h2>
        <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest opacity-60">
          Ringkasan statistik toko Anda hari ini.
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Kartu Total Hutang */}
        <div className="bg-white p-4 rounded-3xl shadow-lg shadow-red-50/50 border border-red-50 relative overflow-hidden group hover:scale-[1.01] transition-transform duration-500">
          <div className="z-10 relative">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="p-1.5 bg-red-100 text-red-600 rounded-lg group-hover:rotate-12 transition-transform">
                <AlertCircle size={14} />
              </div>
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Saldo Piutang</p>
            </div>
            <h3 className="text-xl md:text-2xl font-black text-red-600 tracking-tighter">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(stats.totalPiutang)}
            </h3>
            <p className="text-[9px] text-red-300 font-bold mt-1 italic opacity-60">* Belum lunas</p>
          </div>
          <AlertCircle className="absolute -right-4 -bottom-4 text-red-50 opacity-40 group-hover:scale-110 transition-transform duration-700" size={100} />
        </div>

        {/* Kartu Pelanggan Aktif */}
        <div className="bg-white p-4 rounded-3xl shadow-lg shadow-blue-50/50 border border-blue-50 relative overflow-hidden group hover:scale-[1.01] transition-transform duration-500">
          <div className="z-10 relative">
             <div className="flex items-center gap-1.5 mb-2">
              <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg group-hover:rotate-12 transition-transform">
                <Users size={14} />
              </div>
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Pelanggan Aktif</p>
            </div>
            <h3 className="text-xl md:text-2xl font-black text-blue-600 tracking-tighter">
              {stats.totalPelanggan} <span className="text-xs font-bold opacity-40 lowercase">orang</span>
            </h3>
            <p className="text-[9px] text-blue-300 font-bold mt-1 italic opacity-60">* Member terdaftar</p>
          </div>
          <Users className="absolute -right-4 -bottom-4 text-blue-50 opacity-40 group-hover:scale-110 transition-transform duration-700" size={100} />
        </div>

        {/* Kartu Tunai Hari Ini */}
        <div className="bg-white p-4 rounded-3xl shadow-lg shadow-green-50/50 border border-green-50 relative overflow-hidden group hover:scale-[1.01] transition-transform duration-500">
          <div className="z-10 relative">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="p-1.5 bg-green-100 text-green-600 rounded-lg group-hover:rotate-12 transition-transform">
                <TrendingUp size={14} />
              </div>
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Kas Hari Ini</p>
            </div>
            <h3 className="text-xl md:text-2xl font-black text-green-600 tracking-tighter">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(stats.transaksiHariIni)}
            </h3>
            <p className="text-[9px] text-green-300 font-bold mt-1 italic opacity-60">* Pemasukan tunai</p>
          </div>
          <TrendingUp className="absolute -right-4 -bottom-4 text-green-50 opacity-40 group-hover:scale-110 transition-transform duration-700" size={100} />
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-4 md:p-6 rounded-[2rem] shadow-xl border border-gray-100 flex-1 flex flex-col min-h-[300px] lg:min-h-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-4">
           <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
                 <Wallet size={20} />
              </div>
              <div>
                 <h3 className="text-base md:text-lg font-black text-gray-800 tracking-tight">Tren Setoran Hutang</h3>
                 <p className="text-[10px] text-gray-400 font-bold">Dana cicilan pelanggan (30 Hari Terakhir)</p>
              </div>
           </div>
           <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1 rounded-lg border border-green-100">
              <ArrowUpRight className="text-green-600" size={14} />
              <span className="text-[8px] md:text-[9px] font-black text-green-700 uppercase tracking-widest">Kas Meningkat</span>
           </div>
        </div>

        <div className="flex-1 w-full min-h-0">
          {loadingChart ? (
            <div className="w-full h-full flex flex-col items-center justify-center space-y-2">
               <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-100 border-t-indigo-600"></div>
               <p className="text-[10px] font-bold text-gray-400 animate-pulse">Memuat data...</p>
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: -10 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="formattedDate" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 700 }}
                  interval={Math.ceil(chartData.length / 8)}
                  hide={false}
                />
                <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 700 }}
                   tickFormatter={(val) => `Rp${val >= 1000 ? (val/1000) + 'k' : val}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    backgroundColor: '#1e293b',
                    padding: '8px'
                  }}
                  itemStyle={{ color: '#818cf8', fontWeight: 800, fontSize: '10px' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 600, fontSize: '8px', marginBottom: '2px' }}
                  formatter={(value: any) => [`Rp ${Number(value).toLocaleString()}`, 'Dana Masuk']}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#4f46e5" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
               <Wallet className="text-gray-200 mb-2" size={24} />
               <p className="text-[10px] font-bold text-gray-400 italic">Data belum tersedia.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}