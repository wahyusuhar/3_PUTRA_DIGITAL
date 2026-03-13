'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Banknote, CreditCard, Save, Loader2, User, ChevronRight, Wallet, History, ChevronLeft, HandCoins } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useNotification } from '@/app/components/NotificationProvider';
import Link from 'next/link';

interface Pelanggan {
  id: string;
  nama: string;
  total_hutang_saat_ini: number;
}

interface CatatanHutang {
  id: string;
  jumlah_hutang: number;
  jumlah_bayar: number;
  status_lunas: boolean;
  created_at: string;
  transaksi: {
    catatan_barang: string;
  };
}

function BayarHutangContent() {
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
    jumlah_bayar: '',
    metode: 'cash',
    catatan_barang: 'Bayar Hutang'
  });
  const [unpaidDebts, setUnpaidDebts] = useState<CatatanHutang[]>([]);

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

  useEffect(() => {
    if (selectedPelanggan) {
      fetchUnpaidDebts(selectedPelanggan.id);
    } else {
      setUnpaidDebts([]);
    }
  }, [selectedPelanggan]);

  async function fetchUnpaidDebts(id: string) {
    const { data, error } = await supabase
      .from('catatan_hutang')
      .select(`
        *,
        transaksi ( catatan_barang )
      `)
      .eq('pelanggan_id', id)
      .eq('status_lunas', false)
      .order('created_at', { ascending: true });
    
    if (!error) setUnpaidDebts(data || []);
  }

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
      .gt('total_hutang_saat_ini', 0)
      .ilike('nama', `%${searchTerm}%`)
      .limit(5);

    if (!error) setPelangganList(data || []);
    setFetching(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPelanggan) return showToast('Pilih pelanggan terlebih dahulu.', 'error');
    
    const bayarAmount = Number(formData.jumlah_bayar);
    if (!bayarAmount || bayarAmount <= 0) return showToast('Masukkan jumlah pembayaran yang valid.', 'error');
    
    setLoading(true);

    // 1. Record payment in Transaksi (Type: TUNAI)
    const { data: transData, error: transError } = await supabase
      .from('transaksi')
      .insert([
        {
          pelanggan_id: selectedPelanggan.id,
          tipe_transaksi: 'TUNAI',
          total_harga: bayarAmount,
          catatan_barang: formData.catatan_barang || 'Pembayaran Hutang',
          tanggal_transaksi: new Date().toISOString().split('T')[0]
        }
      ])
      .select()
      .single();

    if (transError) {
      showToast('Gagal mencatat transaksi pembayaran: ' + transError.message, 'error');
      setLoading(false);
      return;
    }

    // 2. Fetch unpaid debts for this customer
    const { data: debts, error: debtsError } = await supabase
      .from('catatan_hutang')
      .select('*')
      .eq('pelanggan_id', selectedPelanggan.id)
      .eq('status_lunas', false)
      .order('created_at', { ascending: true });

    if (!debtsError && debts) {
      let remainingPayment = bayarAmount;
      
      for (const debt of debts) {
        if (remainingPayment <= 0) break;
        
        const currentUnpaid = debt.jumlah_hutang - (debt.jumlah_bayar || 0);
        const paymentForThis = Math.min(remainingPayment, currentUnpaid);
        const newPaidAmount = (debt.jumlah_bayar || 0) + paymentForThis;
        const isLunas = newPaidAmount >= debt.jumlah_hutang;

        await supabase
          .from('catatan_hutang')
          .update({ 
            jumlah_bayar: newPaidAmount,
            status_lunas: isLunas
          })
          .eq('id', debt.id);
        
        remainingPayment -= paymentForThis;
      }
    }

    // 3. Update global balance in Pelanggan
    const sisaHutangGlobal = Math.max(0, (selectedPelanggan.total_hutang_saat_ini || 0) - bayarAmount);
    await supabase
      .from('pelanggan')
      .update({ total_hutang_saat_ini: sisaHutangGlobal })
      .eq('id', selectedPelanggan.id);

    showToast(`Pembayaran Berhasil! Sisa hutang total: Rp ${sisaHutangGlobal.toLocaleString()}`, 'payment', `Hutang di bayar ${bayarAmount.toLocaleString()}`);
    router.push(`/transaksi/struk/${transData.id}`);
    router.refresh();
    setLoading(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col h-full min-h-[calc(100vh-80px)] landscape:min-h-0 landscape:h-auto landscape:p-2">
      <div className="flex items-center gap-4 mb-8 landscape:gap-2 landscape:mb-3">
        <Link href="/transaksi" className="p-3 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors landscape:p-1.5 landscape:rounded-xl">
          <ChevronLeft size={24} className="text-gray-600 landscape:w-5 landscape:h-5" />
        </Link>
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tight landscape:text-xl">Bayar Hutang</h1>
          <p className="text-gray-500 font-medium landscape:text-xs">Proses pembayaran hutang pelanggan.</p>
        </div>
        <Link href="/laporan" className="ml-auto bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center gap-3 hover:bg-blue-100 transition-colors group landscape:p-2 landscape:rounded-xl landscape:gap-1.5">
          <History className="text-blue-600 group-hover:rotate-12 transition-transform landscape:w-4 landscape:h-4" />
          <p className="text-blue-700 font-bold tracking-tight landscape:text-xs">Riwayat</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 landscape:gap-3">
        <div className="space-y-6 landscape:space-y-2">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 landscape:p-3 landscape:rounded-2xl">
            <label className="block text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider landscape:text-[10px] landscape:mb-2">Cari Pelanggan Berhutang</label>
            <div className="relative mb-4 landscape:mb-2">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 landscape:w-4 landscape:h-4 landscape:left-3" size={20} />
              <input
                type="text"
                placeholder="Ketik nama pelanggan..."
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-semibold landscape:pl-9 landscape:pr-3 landscape:py-2 landscape:text-xs landscape:rounded-xl"
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
                  <div className="text-left">
                    <p className="font-bold landscape:text-xs">{p.nama}</p>
                    <p className={`text-xs ${selectedPelanggan?.id === p.id ? 'text-blue-100' : 'text-red-500'} font-bold landscape:text-[10px]`}>
                      Hutang: Rp {p.total_hutang_saat_ini.toLocaleString()}
                    </p>
                  </div>
                  <ChevronRight size={16} className="landscape:w-3 landscape:h-3" />
                </button>
              ))}
            </div>
          </div>

            {selectedPelanggan && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 rounded-[2rem] text-white shadow-xl shadow-blue-100 landscape:p-4 landscape:rounded-xl">
                  <Wallet className="mb-4 opacity-50 landscape:w-6 landscape:h-6 landscape:mb-2" size={40} />
                  <p className="text-blue-100 font-bold uppercase tracking-widest text-xs landscape:text-[10px]">Total Hutang</p>
                  <h2 className="text-4xl font-black mt-1 landscape:text-xl landscape:mt-0">
                    Rp {selectedPelanggan.total_hutang_saat_ini.toLocaleString()}
                  </h2>
                  <p className="mt-4 text-sm font-medium opacity-80 italic landscape:mt-2 landscape:text-xs">A/N: {selectedPelanggan.nama}</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm landscape:p-3 landscape:rounded-2xl">
                  <div className="flex items-center gap-2 mb-4 border-b pb-3 landscape:mb-2 landscape:pb-2">
                    <HandCoins size={18} className="text-blue-600" />
                    <h3 className="font-black text-gray-800 text-sm uppercase tracking-tight">Rincian Barang Hutang</h3>
                  </div>
                  
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar landscape:max-h-[150px]">
                    {unpaidDebts.length === 0 ? (
                      <p className="text-center py-4 text-gray-400 text-xs italic font-bold">Tidak ada rincian barang</p>
                    ) : (
                      unpaidDebts.map((debt) => (
                        <div key={debt.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 landscape:p-2">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-wider">
                              {new Date(debt.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="text-xs font-black text-gray-900">
                              Rp {(debt.jumlah_hutang - debt.jumlah_bayar).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-gray-600 leading-relaxed">
                            {(debt.transaksi?.catatan_barang || 'Transaksi Tanpa Nama').split(/,\s*/).map((line, idx) => (
                              <span key={idx} className="block">{line}</span>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
        </div>

        <div>
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 space-y-6 landscape:p-3 landscape:rounded-2xl landscape:space-y-3">
            <h3 className="text-lg font-black text-gray-800 border-b pb-4 landscape:text-sm landscape:pb-2">Input Pembayaran</h3>
            
            <div>
              <p className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider landscape:text-[10px] landscape:mb-1">Metode Bayar</p>
              <div className="grid grid-cols-2 gap-3 landscape:gap-1.5">
                {[
                  { id: 'cash', label: 'Tunai / Cash', icon: Banknote, color: 'green' },
                  { id: 'transfer', label: 'Transfer', icon: CreditCard, color: 'blue' }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, metode: m.id })}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all landscape:flex-row landscape:justify-center landscape:p-2 landscape:rounded-xl landscape:gap-1 ${
                      formData.metode === m.id
                        ? `border-${m.color === 'green' ? 'green' : 'blue'}-500 bg-${m.color === 'green' ? 'green' : 'blue'}-50 text-${m.color === 'green' ? 'green' : 'blue'}-700`
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
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider landscape:text-[10px] landscape:mb-1">Jumlah Bayar (Rp)</label>
              <input
                type="number"
                placeholder="Masukkan nominal..."
                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-black text-2xl text-green-600 landscape:px-3 landscape:py-2 landscape:rounded-xl landscape:text-lg"
                value={formData.jumlah_bayar}
                onChange={(e) => setFormData({ ...formData, jumlah_bayar: e.target.value })}
              />
              {selectedPelanggan && (
                <div className="flex gap-2 mt-2 landscape:mt-1">
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, jumlah_bayar: (selectedPelanggan.total_hutang_saat_ini / 2).toString()})}
                    className="text-[10px] bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-lg font-bold text-gray-600"
                  >
                    Setengah (50%)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, jumlah_bayar: selectedPelanggan.total_hutang_saat_ini.toString()})}
                    className="text-[10px] bg-green-100 hover:bg-green-200 px-2 py-1 rounded-lg font-bold text-green-600"
                  >
                    Lunas
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !selectedPelanggan}
              className={`w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-black text-xl shadow-lg transition-all active:scale-95 landscape:py-2.5 landscape:text-sm landscape:rounded-xl landscape:gap-1.5 ${
                !selectedPelanggan 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-green-600 text-white shadow-green-200 hover:bg-green-700'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin landscape:w-4 landscape:h-4" size={24} />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save size={24} className="landscape:w-4 landscape:h-4" />
                  Konfirmasi Pembayaran
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function BayarHutang() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BayarHutangContent />
    </Suspense>
  );
}
