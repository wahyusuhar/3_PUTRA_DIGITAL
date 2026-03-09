'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, ShoppingCart, CreditCard, Banknote, History, Save, Loader2, User, ChevronRight, Calculator, Plus } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useNotification } from '@/app/components/NotificationProvider';

interface Pelanggan {
  id: string;
  nama: string;
  total_hutang_saat_ini: number;
}

function TransaksiContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get('pelangganId');
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [pelangganList, setPelangganList] = useState<Pelanggan[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPelanggan, setSelectedPelanggan] = useState<Pelanggan | null>(null);

  const [formData, setFormData] = useState({
    total_harga: '',
    metode: 'cash', // 'cash', 'transfer', 'hutang'
    catatan_barang: ''
  });

  // Fetch preselected pelanggan if ID is in URL
  useEffect(() => {
    if (preselectedId) {
      fetchSinglePelanggan(preselectedId);
    }
  }, [preselectedId]);

  async function fetchSinglePelanggan(id: string) {
    const { data, error } = await supabase
      .from('pelanggan')
      .select('id, nama, total_hutang_saat_ini')
      .eq('id', id)
      .single();
    
    if (!error && data) setSelectedPelanggan(data);
  }

  // Fetch pelanggan for search
  useEffect(() => {
    if (searchTerm.length > 1) {
      searchPelanggan();
    } else {
      setPelangganList([]);
    }
  }, [searchTerm]);

  async function searchPelanggan() {
    setFetching(true);
    const { data, error } = await supabase
      .from('pelanggan')
      .select('id, nama, total_hutang_saat_ini')
      .ilike('nama', `%${searchTerm}%`)
      .limit(5);

    if (!error) setPelangganList(data || []);
    setFetching(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPelanggan) return showToast('Pilih pelanggan terlebih dahulu.', 'error');
    if (!formData.total_harga || isNaN(Number(formData.total_harga))) return showToast('Masukkan jumlah yang valid.', 'error');

    setLoading(true);
    const nominal = Number(formData.total_harga);
    const isHutang = formData.metode === 'hutang';
    const tipe = isHutang ? 'HUTANG' : 'TUNAI';

    // 1. Insert Transaction
    const { data: transData, error: transError } = await supabase
      .from('transaksi')
      .insert([
        {
          pelanggan_id: selectedPelanggan.id,
          tipe_transaksi: tipe,
          total_harga: nominal,
          catatan_barang: formData.catatan_barang || 'Transaksi Penjualan',
          tanggal_transaksi: new Date().toISOString().split('T')[0]
        }
      ])
      .select()
      .single();

    if (transError) {
      showToast('Gagal mencatat transaksi: ' + transError.message, 'error');
      setLoading(false);
      return;
    }

    // 2. Handle Logic for 'HUTANG'
    if (isHutang) {
      // Add to total_hutang_saat_ini in pelanggan
      const newDebt = (selectedPelanggan.total_hutang_saat_ini || 0) + nominal;
      await supabase
        .from('pelanggan')
        .update({ total_hutang_saat_ini: newDebt })
        .eq('id', selectedPelanggan.id);

      // Create record in catatan_hutang
      await supabase
        .from('catatan_hutang')
        .insert([
          {
            pelanggan_id: selectedPelanggan.id,
            transaksi_id: transData.id,
            jumlah_hutang: nominal,
            jumlah_bayar: 0,
            status_lunas: false,
            keterangan: formData.catatan_barang
          }
        ]);
    }

    showToast('Transaksi Berhasil Dicatat!', 'transaction');
    router.push(`/transaksi/struk/${transData.id}`);
    router.refresh();
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col h-full min-h-[calc(100vh-80px)] landscape:min-h-0 landscape:h-auto landscape:p-2">
      <div className="flex justify-between items-center mb-10 landscape:mb-3">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tight landscape:text-xl">Transaksi Baru</h1>
          <p className="text-gray-500 font-medium landscape:text-xs">Catat penjualan harian dengan mudah.</p>
        </div>
        <div className="flex gap-4 landscape:gap-2">
          <Link href="/transaksi/bayar" className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-center gap-3 hover:bg-red-100 transition-colors group landscape:p-2 landscape:rounded-xl landscape:gap-1.5">
            <Calculator className="text-red-600 group-hover:scale-110 transition-transform landscape:w-4 landscape:h-4" />
            <p className="text-red-700 font-bold whitespace-nowrap landscape:text-xs">Bayar Hutang</p>
          </Link>
          <Link href="/laporan" className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center gap-3 hover:bg-blue-100 transition-colors group landscape:p-2 landscape:rounded-xl landscape:gap-1.5">
            <History className="text-blue-600 group-hover:rotate-12 transition-transform landscape:w-4 landscape:h-4" />
            <p className="text-blue-700 font-bold tracking-tight landscape:text-xs">Riwayat</p>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 landscape:gap-3">
        <div className="space-y-6 landscape:space-y-2">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 landscape:p-3 landscape:rounded-2xl">
            <label className="block text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider landscape:text-[10px] landscape:mb-2">Langkah 1: Cari Pelanggan</label>
            <div className="relative mb-4 landscape:mb-2">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 landscape:w-4 landscape:h-4 landscape:left-3" size={20} />
              <input
                type="text"
                placeholder="Ketik nama pelanggan..."
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-semibold landscape:pl-9 landscape:pr-3 landscape:py-2 landscape:text-xs landscape:rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {fetching && <div className="p-4 text-center text-gray-400 font-medium italic">Mencari...</div>}
            
            <div className="space-y-2 mt-4 landscape:mt-2">
              {pelangganList.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPelanggan(p);
                    setSearchTerm('');
                    setPelangganList([]);
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border landscape:p-2 landscape:rounded-xl ${
                    selectedPelanggan?.id === p.id 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-gray-700 border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 text-left landscape:gap-2">
                    <User size={20} className={`landscape:w-4 landscape:h-4 ${selectedPelanggan?.id === p.id ? 'text-white' : 'text-gray-400'}`} />
                    <span className="font-bold landscape:text-xs">{p.nama}</span>
                  </div>
                  <ChevronRight size={16} className="landscape:w-3 landscape:h-3" />
                </button>
              ))}
            </div>

            {selectedPelanggan && (
              <div className="mt-6 p-5 bg-blue-50 rounded-2xl border border-blue-100 landscape:mt-2 landscape:p-3 landscape:rounded-xl">
                <p className="text-xs text-blue-600 font-bold uppercase mb-1 landscape:text-[8px] landscape:mb-0">Pelanggan Terpilih</p>
                <p className="text-xl font-black text-blue-900 landscape:text-sm">{selectedPelanggan.nama}</p>
                <div className="mt-2 pt-2 border-t border-blue-200 landscape:mt-1 landscape:pt-1">
                  <p className="text-xs text-blue-600 font-bold uppercase landscape:text-[8px]">Hutang Saat Ini</p>
                  <p className="text-lg font-black text-red-600 landscape:text-xs">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(selectedPelanggan.total_hutang_saat_ini || 0)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 space-y-6 landscape:p-3 landscape:rounded-2xl landscape:space-y-3">
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider landscape:text-[10px] landscape:mb-1">Langkah 2: Detail Belanja</label>
            
            <div>
              <p className="text-sm font-bold text-gray-500 mb-3 landscape:text-[10px] landscape:mb-1">Metode Pembayaran</p>
              <div className="grid grid-cols-2 gap-3 landscape:gap-1.5">
                {[
                  { id: 'cash', label: 'Cash / Tunai', icon: Banknote, color: 'green' },
                  { id: 'hutang', label: 'Hutang / Kasbon', icon: Calculator, color: 'red' }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, metode: m.id })}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all landscape:flex-row landscape:justify-center landscape:p-2 landscape:rounded-xl landscape:gap-1 ${
                      formData.metode === m.id
                        ? `border-${m.color === 'green' ? 'green' : 'red'}-500 bg-${m.color === 'green' ? 'green' : 'red'}-50 text-${m.color === 'green' ? 'green' : 'red'}-700`
                        : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'
                    }`}
                  >
                    <m.icon size={24} className="landscape:w-4 landscape:h-4" />
                    <span className="font-bold text-xs uppercase landscape:text-[8px]">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider landscape:text-[10px] landscape:mb-1">Total Harga (Rp)</label>
              <input
                type="number"
                placeholder="0"
                className="w-full px-5 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-black text-2xl text-blue-600 landscape:px-3 landscape:py-2 landscape:rounded-xl landscape:text-lg"
                value={formData.total_harga}
                onChange={(e) => setFormData({ ...formData, total_harga: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider landscape:text-[10px] landscape:mb-1">Catatan Barang</label>
              <textarea
                placeholder="Contoh: Beras 5kg, Telur 1kg..."
                rows={2}
                className="w-full px-5 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-semibold resize-none landscape:px-3 landscape:py-2 landscape:rounded-xl landscape:text-xs"
                value={formData.catatan_barang}
                onChange={(e) => setFormData({ ...formData, catatan_barang: e.target.value })}
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={loading || !selectedPelanggan}
              className={`w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-black text-xl shadow-lg transition-all active:scale-95 landscape:py-2.5 landscape:text-sm landscape:rounded-xl landscape:gap-1.5 ${
                !selectedPelanggan 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin landscape:w-4 landscape:h-4" size={24} />
                  Memproses...
                </>
              ) : (
                <>
                  <Save size={24} className="landscape:w-4 landscape:h-4" />
                  Simpan Transaksi
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function TransaksiBaru() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TransaksiContent />
    </Suspense>
  );
}
