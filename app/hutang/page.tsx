'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Search, Wallet, Printer, CheckCircle2 } from 'lucide-react';
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
    tanggal_transaksi: string;
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
        transaksi (catatan_barang, tanggal_transaksi)
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
    /* Container Utama: Paksa tinggi setinggi layar (h-screen) */
    <div className="w-full h-screen flex flex-col bg-gray-50/50 overflow-hidden">
      
      {/* HEADER: Tidak boleh menyusut (shrink-0) */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 p-4 md:px-6 shrink-0">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">Rekapan Hutang</h1>
          <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest opacity-60">
            Monitor semua kasbon pelanggan yang belum lunas.
          </p>
        </div>
        
        <div className="bg-red-50 px-4 py-2 rounded-xl border border-red-100 flex flex-col items-center">
          <p className="text-[8px] font-black text-red-400 uppercase tracking-widest">Total Piutang</p>
          <p className="text-lg md:text-xl font-black text-red-600 leading-none mt-0.5">
            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalOutstanding)}
          </p>
        </div>
      </header>

      {/* SEARCH BAR: Tidak boleh menyusut (shrink-0) */}
      <div className="mx-4 md:mx-6 bg-white p-2.5 rounded-xl shadow-sm border border-gray-100 mb-4 flex items-center gap-3 shrink-0">
        <Search className="text-gray-400 ml-2" size={16} />
        <input 
          type="text" 
          placeholder="Cari nama atau barang..."
          className="flex-1 outline-none font-bold text-gray-700 p-1 text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* CONTENT AREA: Mengambil sisa ruang (flex-1) dan bisa scroll (overflow-y-auto) */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-10 custom-scrollbar">
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="p-20 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
              <p className="text-gray-500 font-medium">Memuat data hutang...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
              <CheckCircle2 size={48} className="text-green-200 mx-auto mb-4" />
              <p className="text-gray-400 font-black italic">Hore! Tidak ada hutang yang tertunggak.</p>
            </div>
          ) : (
            filteredRecords.map((r) => {
              const sisa = r.jumlah_hutang - (r.jumlah_bayar || 0);
              return (
                <div key={r.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group overflow-hidden relative">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    
                    {/* Info Pelanggan & Tanggal */}
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-gray-50 rounded-2xl text-gray-400 group-hover:bg-red-50 group-hover:text-red-500 transition-colors flex flex-col items-center justify-center min-w-[70px]">
                        <p className="text-[9px] font-black uppercase text-center">
                          {format(new Date(r.transaksi?.tanggal_transaksi || r.created_at), 'EEEE', { locale: id })}
                        </p>
                        <p className="text-lg font-black leading-none my-1">
                          {format(new Date(r.transaksi?.tanggal_transaksi || r.created_at), 'dd')}
                        </p>
                        <p className="text-[9px] font-bold uppercase">
                          {format(new Date(r.transaksi?.tanggal_transaksi || r.created_at), 'MMM')}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-gray-800">{r.pelanggan?.nama}</h3>
                        <div className="mt-1 flex items-start gap-2">
                          <span className="text-[9px] font-black bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase">Barang:</span>
                          <p className="text-xs font-medium text-gray-600 italic max-w-[200px] md:max-w-xs truncate">
                            {r.transaksi?.catatan_barang || 'Tanpa catatan barang'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Info Nominal */}
                    <div className="flex flex-col md:items-end gap-0.5">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sisa Hutang</p>
                      <p className="text-xl font-black text-red-600">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(sisa)}
                      </p>
                      {r.jumlah_bayar > 0 && (
                        <p className="text-[9px] font-bold text-gray-400">
                          Dicicil: Rp {r.jumlah_bayar.toLocaleString()}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Link 
                        href={`/transaksi/bayar?pelangganId=${r.pelanggan_id}`}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-100 hover:bg-red-700 transition-all active:scale-95 text-sm"
                      >
                        <Wallet size={16} />
                        Bayar
                      </Link>
                      <Link 
                        href={`/transaksi/struk/${r.transaksi_id}`}
                        className="p-2.5 bg-gray-100 text-gray-500 rounded-2xl hover:bg-gray-200 transition-colors"
                        title="Cetak Struk"
                      >
                        <Printer size={18} />
                      </Link>
                    </div>
                  </div>
                  
                  {/* Progress Bar (Jika ada cicilan) */}
                  {r.jumlah_bayar > 0 && (
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-50">
                      <div 
                        className="h-full bg-red-400 transition-all duration-500" 
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
    </div>
  );
}