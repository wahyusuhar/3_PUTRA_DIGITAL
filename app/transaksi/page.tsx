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
  const { showToast, playSound } = useNotification();
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

  const [items, setItems] = useState<{ id: string; nama: string; harga: number }[]>([]);
  const [newItem, setNewItem] = useState({ nama: '', harga: '' });

  // Sync items to total_harga and catatan_barang
  useEffect(() => {
    const total = items.reduce((acc, item) => acc + item.harga, 0);
    const notes = items.map(item => `${item.nama} (${item.harga.toLocaleString()})`).join(', ');
    
    setFormData(prev => ({
      ...prev,
      total_harga: total > 0 ? total.toString() : '',
      catatan_barang: notes
    }));
  }, [items]);

  const addItem = () => {
    if (!newItem.nama.trim()) return; // Item must have a name
    
    const item = {
      id: Math.random().toString(36).substr(2, 9),
      nama: newItem.nama.trim(),
      harga: newItem.harga ? Number(newItem.harga) : 0
    };
    
    setItems([...items, item]);
    setNewItem({ nama: '', harga: '' });
    playSound?.('transaction');
    
    // Auto-focus back to name input for speed (we can use a ref or just rely on browser behavior)
    const nameInput = document.querySelector('input[placeholder="Nama Barang..."]') as HTMLInputElement;
    if (nameInput) nameInput.focus();
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

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
    // Allow nominal 0 for case where prices are unknown
    const nominal = formData.total_harga ? Number(formData.total_harga) : 0;
    if (isNaN(nominal)) return showToast('Masukkan jumlah yang valid.', 'error');

    setLoading(true);
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

    showToast('Transaksi Berhasil Dicatat!', 'transaction', 'Transaksi Berhasil di simpan');
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

            <div className="border-b border-gray-100 pb-4 mb-2">
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider landscape:text-[10px] landscape:mb-1">Input Item Barang</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nama Barang..."
                  className="flex-1 px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold landscape:py-2 landscape:text-xs"
                  value={newItem.nama}
                  onChange={(e) => setNewItem({ ...newItem, nama: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
                />
                <input
                  type="number"
                  placeholder="Harga"
                  className="w-24 md:w-32 px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-blue-600 landscape:py-2 landscape:text-xs"
                  value={newItem.harga}
                  onChange={(e) => setNewItem({ ...newItem, harga: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
                />
                <button
                  type="button"
                  onClick={addItem}
                  className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-100"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 min-h-[150px] max-h-[300px] overflow-y-auto border border-gray-100 landscape:p-2 landscape:min-h-[100px] landscape:max-h-[150px]">
              <div className="flex items-center gap-2 mb-3 border-b border-gray-200 pb-2 landscape:mb-1 landscape:pb-1">
                <ShoppingCart size={14} className="text-gray-400" />
                <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Daftar Barang ({items.length})</h4>
              </div>
              
              {items.length === 0 ? (
                <p className="text-center py-10 text-gray-400 font-bold italic text-xs landscape:py-4">Belum ada barang ditambahkan</p>
              ) : (
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm transition-all hover:border-blue-200 landscape:p-2 landscape:rounded-lg">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-800 text-sm landscape:text-xs">{item.nama}</span>
                        <span className="text-[10px] font-black text-blue-600">Rp {item.harga.toLocaleString()}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <ShoppingCart size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2">
              <div className="flex justify-between items-end mb-1">
                 <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Otomatis</label>
                 <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Rp</span>
              </div>
              <div className="w-full px-5 py-3 bg-blue-50 border border-blue-100 rounded-2xl font-black text-3xl text-blue-700 text-right shadow-inner landscape:text-xl landscape:py-2">
                {formData.total_harga ? Number(formData.total_harga).toLocaleString() : '0'}
              </div>
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
