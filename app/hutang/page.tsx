'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Search, ClipboardList, Wallet, User, Calendar, ArrowRight, Printer, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import Link from 'next/link';

interface HutangRecord {
  id: string;
  jumlah_hutang: number;
  jumlah_bayar: number;
  status_lunas: boolean;
  created_at: string;
  transaksi_id: string;
  pelanggan_id: string;
  pelanggan: {
    nama: string;
  };
  transaksi: {
    catatan_barang: string;
  };
}

export default function RekapanHutangPage() {
  const [records, setRecords] = useState<HutangRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchHutang();
  }, []);

  async function fetchHutang() {
    setLoading(true);
    const { data, error } = await supabase
      .from('catatan_hutang')
      .select(`
        *,
        pelanggan (nama),
        transaksi (catatan_barang)
      `)
      .eq('status_lunas', false)
      .order('created_at', { ascending: false });

    if (!error) {
      setRecords(data || []);
    }
    setLoading(false);
  }

  const filteredRecords = records.filter(r => 
    r.pelanggan?.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.transaksi?.catatan_barang?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOutstanding = records.reduce((acc, r) => acc + (r.jumlah_hutang - (r.jumlah_bayar || 0)), 0);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col h-full min-h-[calc(100vh-80px)] landscape:min-h-0 landscape:h-auto landscape:p-2">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 landscape:gap-2 landscape:mb-3">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight landscape:text-xl">Rekapan Hutang</h1>
          <p className="text-gray-500 font-medium landscape:text-xs">Monitor semua kasbon pelanggan yang belum lunas.</p>
        </div>
        
        <div className="bg-red-50 px-6 py-4 rounded-3xl border border-red-100 landscape:px-3 landscape:py-2 landscape:rounded-xl">
          <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1 text-center landscape:text-[8px] landscape:mb-0">Total Belum Tertagih</p>
          <p className="text-2xl font-black text-red-600 landscape:text-lg">
            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalOutstanding)}
          </p>
        </div>
      </header>

      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 mb-8 flex items-center gap-4 landscape:p-2 landscape:rounded-xl landscape:mb-3 landscape:gap-2">
        <Search className="text-gray-400 ml-2 landscape:w-4 landscape:h-4 landscape:ml-1" size={20} />
        <input 
          type="text" 
          placeholder="Cari nama pelanggan atau barang..."
          className="flex-1 outline-none font-bold text-gray-700 p-2 landscape:p-1 landscape:text-xs"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 landscape:gap-2 flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-20 text-center landscape:p-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4 landscape:h-6 landscape:w-6 landscape:mb-2"></div>
            <p className="text-gray-500 font-medium landscape:text-xs">Memuat data hutang...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100 landscape:p-6 landscape:rounded-xl">
            <CheckCircle2 size={48} className="text-green-200 mx-auto mb-4 landscape:w-8 landscape:h-8 landscape:mb-2" />
            <p className="text-gray-400 font-black italic landscape:text-xs">Hore! Tidak ada hutang yang tertunggak.</p>
          </div>
        ) : (
          filteredRecords.map((r) => {
            const sisa = r.jumlah_hutang - (r.jumlah_bayar || 0);
            return (
              <div key={r.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group overflow-hidden relative landscape:p-3 landscape:rounded-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 landscape:flex-row landscape:gap-3 landscape:items-center">
                  <div className="flex items-start gap-4 landscape:gap-2 landscape:items-center">
                    <div className="p-4 bg-gray-50 rounded-2xl text-gray-400 group-hover:bg-red-50 group-hover:text-red-500 transition-colors flex flex-col items-center justify-center min-w-[80px] landscape:p-2 landscape:rounded-xl landscape:min-w-[60px]">
                      <p className="text-[10px] font-black uppercase text-center landscape:text-[8px]">{format(new Date(r.created_at), 'EEEE', { locale: id })}</p>
                      <p className="text-xl font-black landscape:text-sm">{format(new Date(r.created_at), 'dd')}</p>
                      <p className="text-[10px] font-bold uppercase landscape:text-[8px]">{format(new Date(r.created_at), 'MMM')}</p>
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-800 landscape:text-sm">{r.pelanggan?.nama}</h3>
                      <div className="mt-2 flex items-start gap-2 landscape:mt-0.5 landscape:gap-1">
                        <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md uppercase landscape:text-[8px] landscape:px-1.5 landscape:py-0">Detail Barang:</span>
                        <p className="text-sm font-medium text-gray-600 italic landscape:text-[10px] max-w-xs truncate">
                          {r.transaksi?.catatan_barang || 'Tanpa catatan barang'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:items-end gap-1 landscape:mr-auto landscape:ml-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest landscape:text-[8px]">Sisa Hutang</p>
                    <p className="text-2xl font-black text-red-600 landscape:text-base">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(sisa)}
                    </p>
                    {r.jumlah_bayar > 0 && (
                      <p className="text-[10px] font-bold text-gray-400 landscape:text-[8px]">
                        Dicicil: Rp {r.jumlah_bayar.toLocaleString()} / Total: Rp {r.jumlah_hutang.toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 landscape:gap-1.5">
                    <Link 
                      href={`/transaksi/bayar?pelangganId=${r.pelanggan_id}`}
                      className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-100 hover:bg-red-700 transition-all active:scale-95 landscape:px-3 landscape:py-1.5 landscape:rounded-xl landscape:text-xs"
                    >
                      <Wallet size={18} className="landscape:w-4 landscape:h-4" />
                      Bayar
                    </Link>
                    <Link 
                      href={`/transaksi/struk/${r.transaksi_id}`}
                      className="p-3 bg-gray-100 text-gray-500 rounded-2xl hover:bg-gray-200 transition-colors landscape:p-1.5 landscape:rounded-xl"
                      title="Cetak Struk Transaksi Ini"
                    >
                      <Printer size={18} className="landscape:w-4 landscape:h-4" />
                    </Link>
                  </div>
                </div>
                
                {/* Visual Progress Bar if partially paid */}
                {r.jumlah_bayar > 0 && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-50">
                    <div 
                      className="h-full bg-red-400" 
                      style={{ width: `${(r.jumlah_bayar / r.jumlah_hutang) * 100}%` }}
                    ></div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
