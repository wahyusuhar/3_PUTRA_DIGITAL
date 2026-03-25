'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Banknote, CreditCard, Save, Loader2, ChevronLeft, HandCoins, Calendar, AlertTriangle, ChevronRight } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useNotification } from '@/app/components/NotificationProvider';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import Link from 'next/link';

// --- Interfaces ---
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
  isInvalid?: boolean; // Flag tambahan untuk UI
  transaksi: {
    catatan_barang: string;
    tanggal_transaksi: string;
  };
}

interface GroupedHutang {
  dateKey: string;
  dateLabel: string;
  items: CatatanHutang[];
  subtotal: number;
}

function BayarHutangContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get('pelangganId');
  const { showToast, showModalAlert } = useNotification();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [pelangganList, setPelangganList] = useState<Pelanggan[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPelanggan, setSelectedPelanggan] = useState<Pelanggan | null>(null);

  const [formData, setFormData] = useState({
    jumlah_bayar: '',
    metode: 'cash',
    catatan_barang: 'Bayar Hutang',
    tanggal_transaksi: new Date().toISOString().split('T')[0]
  });
  const [groupedDebts, setGroupedDebts] = useState<GroupedHutang[]>([]);
  const [hasUnpricedDebts, setHasUnpricedDebts] = useState(false);

  // --- Fungsi Validasi Teks (Mencari harga 0 di dalam string) ---
  const checkZeroInText = (text: string) => {
    return /\(0\)/.test(text); // Mengembalikan true jika ada teks "(0)"
  };

  useEffect(() => {
    if (preselectedId) fetchSinglePelanggan(preselectedId);
  }, [preselectedId]);

  async function fetchSinglePelanggan(id: string) {
    const { data, error } = await supabase.from('pelanggan').select('id, nama, total_hutang_saat_ini').eq('id', id).single();
    if (!error && data) setSelectedPelanggan(data);
  }

  useEffect(() => {
    if (selectedPelanggan) fetchUnpaidDebts(selectedPelanggan.id);
    else { setGroupedDebts([]); setHasUnpricedDebts(false); }
  }, [selectedPelanggan]);

  async function fetchUnpaidDebts(id: string) {
    const { data, error } = await supabase
      .from('catatan_hutang')
      .select(`*, transaksi ( catatan_barang, tanggal_transaksi )`)
      .eq('pelanggan_id', id)
      .eq('status_lunas', false)
      .order('created_at', { ascending: true });
    
    if (!error && data) {
      const groups: Record<string, GroupedHutang> = {};
      let unpricedFound = false;

      data.forEach((item: any) => {
        // Cek apakah nominal total 0 ATAU ada item bertanda (0) di teks
        const isZeroInText = checkZeroInText(item.transaksi?.catatan_barang || "");
        const isZeroTotal = (item.jumlah_hutang || 0) <= 0;
        
        if (isZeroInText || isZeroTotal) unpricedFound = true;

        const dateStr = item.transaksi?.tanggal_transaksi || item.created_at;
        const dateKey = format(new Date(dateStr), 'yyyy-MM-dd');

        if (!groups[dateKey]) {
          groups[dateKey] = {
            dateKey,
            dateLabel: format(new Date(dateStr), 'EEEE, dd MMM yyyy', { locale: localeId }),
            items: [],
            subtotal: 0
          };
        }

        groups[dateKey].items.push({ ...item, isInvalid: isZeroInText || isZeroTotal });
        groups[dateKey].subtotal += (item.jumlah_hutang - (item.jumlah_bayar || 0));
      });

      setGroupedDebts(Object.values(groups).sort((a, b) => new Date(b.dateKey).getTime() - new Date(a.dateKey).getTime()));
      setHasUnpricedDebts(unpricedFound);
    }
  }

  useEffect(() => {
    if (searchTerm.length > 1) searchPelanggan();
    else setPelangganList([]);
  }, [searchTerm]);

  async function searchPelanggan() {
    setFetching(true);
    const { data, error } = await supabase.from('pelanggan').select('id, nama, total_hutang_saat_ini').gt('total_hutang_saat_ini', 0).ilike('nama', `%${searchTerm}%`).limit(5);
    if (!error) setPelangganList(data || []);
    setFetching(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPelanggan) return;
    
    // --- SERVER-SIDE RE-VALIDATION (Check Text & Amount) ---
    const { data: freshDebts } = await supabase
      .from('catatan_hutang')
      .select(`jumlah_hutang, transaksi(catatan_barang)`)
      .eq('pelanggan_id', selectedPelanggan.id)
      .eq('status_lunas', false);

    const isStillInvalid = freshDebts?.some(d => 
      (d.jumlah_hutang || 0) <= 0 || checkZeroInText(d.transaksi?.catatan_barang || "")
    );

    if (isStillInvalid) {
      showModalAlert?.('⚠️ PEMBAYARAN DITOLAK!\n\nMasih ada barang dengan harga (0) dalam catatan. Silahkan lengkapi semua harga di Buku Hutang sebelum menerima pembayaran.', 'Validasi Gagal');
      setHasUnpricedDebts(true);
      return;
    }

    setLoading(true);
    const bayarAmount = Number(formData.jumlah_bayar);

    const { data: transData, error: transError } = await supabase.from('transaksi').insert([{
        pelanggan_id: selectedPelanggan.id,
        tipe_transaksi: 'TUNAI',
        total_harga: bayarAmount,
        catatan_barang: formData.catatan_barang,
        tanggal_transaksi: formData.tanggal_transaksi
    }]).select().single();

    if (transError) { showToast(transError.message, 'error'); setLoading(false); return; }

    const { data: debts } = await supabase.from('catatan_hutang').select('*').eq('pelanggan_id', selectedPelanggan.id).eq('status_lunas', false).order('created_at', { ascending: true });

    if (debts) {
      let remaining = bayarAmount;
      for (const debt of debts) {
        if (remaining <= 0) break;
        const unpaid = debt.jumlah_hutang - (debt.jumlah_bayar || 0);
        const pay = Math.min(remaining, unpaid);
        const totalPaid = (debt.jumlah_bayar || 0) + pay;
        await supabase.from('catatan_hutang').update({ jumlah_bayar: totalPaid, status_lunas: totalPaid >= debt.jumlah_hutang }).eq('id', debt.id);
        remaining -= pay;
      }
    }

    const sisaGlobal = Math.max(0, (selectedPelanggan.total_hutang_saat_ini || 0) - bayarAmount);
    await supabase.from('pelanggan').update({ total_hutang_saat_ini: sisaGlobal }).eq('id', selectedPelanggan.id);

    showToast(`Berhasil! Sisa: Rp ${sisaGlobal.toLocaleString()}`, 'payment');
    router.push(`/transaksi/struk/${transData.id}`);
  };

  return (
    <div className="w-full flex flex-col flex-1 h-screen overflow-hidden bg-gray-50/30">
      <div className="p-4 md:p-6 flex items-center gap-4 shrink-0 bg-white border-b">
        <Link href="/transaksi" className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"><ChevronLeft size={20}/></Link>
        <h1 className="text-xl md:text-2xl font-black text-gray-800">Bayar Hutang</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-2 md:p-6 custom-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-2 landscape:grid-cols-2 gap-3 md:gap-6">
          
          <div className="space-y-3 md:space-y-6">
            <div className="bg-white p-3 md:p-5 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Cari Pelanggan</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" placeholder="Ketik nama..." className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none font-bold text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
              </div>
              <div className="mt-3 space-y-2">
                {pelangganList.map(p => (
                  <button key={p.id} onClick={() => { setSelectedPelanggan(p); setSearchTerm(''); setPelangganList([]); }} className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${selectedPelanggan?.id === p.id ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50 text-gray-700'}`}>
                    <div className="text-left">
                      <p className="font-bold text-sm">{p.nama}</p>
                      <p className={`text-[10px] font-bold ${selectedPelanggan?.id === p.id ? 'text-blue-100' : 'text-red-500'}`}>Rp {p.total_hutang_saat_ini.toLocaleString()}</p>
                    </div>
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
            </div>

            {selectedPelanggan && (
              <div className="space-y-3 md:space-y-4">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 md:p-6 rounded-2xl md:rounded-[2rem] text-white shadow-lg">
                  <p className="text-blue-100 font-bold uppercase tracking-widest text-[10px]">Total Hutang</p>
                  <h2 className="text-3xl font-black">Rp {selectedPelanggan.total_hutang_saat_ini.toLocaleString()}</h2>
                  <p className="mt-2 text-xs opacity-80 font-bold italic">Pelanggan: {selectedPelanggan.nama}</p>
                </div>

                <div className="bg-white p-3 md:p-5 rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm">
                  <h3 className="font-black text-gray-800 text-[10px] md:text-xs uppercase mb-3 flex items-center gap-2"><HandCoins size={14} className="text-blue-600" /> Rincian Belanja</h3>
                  <div className="space-y-3 max-h-[300px] md:max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {groupedDebts.map(group => (
                      <div key={group.dateKey} className="space-y-2">
                        <p className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded w-fit uppercase">{group.dateLabel}</p>
                        {group.items.map(debt => (
                          <div key={debt.id} className={`p-2 md:p-3 rounded-xl border transition-colors ${debt.isInvalid ? 'bg-red-50 border-red-300 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
                            <div className="flex justify-between font-black text-[10px]">
                              <span className="text-gray-400">{format(new Date(debt.created_at), 'HH:mm')}</span>
                              <span className={debt.isInvalid ? 'text-red-600 underline' : 'text-gray-900'}>
                                Rp {(debt.jumlah_hutang - (debt.jumlah_bayar || 0)).toLocaleString()}
                                {debt.isInvalid && " (!)"}
                              </span>
                            </div>
                            <div className="mt-1">
                              {debt.transaksi?.catatan_barang.split(',').map((item, idx) => (
                                <span key={idx} className={`text-[10px] block font-bold ${item.includes('(0)') ? 'text-red-600 bg-red-100 px-1 rounded w-fit' : 'text-gray-600'}`}>
                                  {item.trim()}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="landscape:sticky landscape:top-0">
            <form onSubmit={handleSubmit} className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] shadow-xl border border-gray-100 space-y-3 md:space-y-5 sticky top-6">
              {hasUnpricedDebts && (
                <div className="p-4 bg-red-600 rounded-2xl text-white shadow-xl shadow-red-100 border-2 border-red-500">
                  <div className="flex items-center gap-2 font-black text-xs uppercase mb-3"><AlertTriangle size={18} className="animate-pulse"/> Pembayaran Terkunci</div>
                  <p className="text-[10px] font-bold leading-relaxed opacity-90 mb-4">Ditemukan barang dengan harga (0). Silahkan klik lengkapi harga pada rincian di bawah ini:</p>
                  
                  <div className="space-y-2 mb-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                    {groupedDebts.flatMap(g => g.items.filter(i => i.isInvalid)).map(item => (
                      <div key={item.id} className="bg-red-700/50 p-3 rounded-xl border border-red-400/30 flex items-center justify-between gap-3 group hover:bg-red-800/60 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-black opacity-60 uppercase mb-0.5">{format(new Date(item.transaksi?.tanggal_transaksi || item.created_at), 'dd MMM yyyy')}</p>
                          <p className="text-[10px] font-bold truncate leading-tight break-all">
                            {item.transaksi?.catatan_barang.split(',').find(s => s.includes('(0)'))?.trim() || item.transaksi?.catatan_barang}
                          </p>
                        </div>
                        <Link 
                          href={`/pelanggan/${selectedPelanggan?.id}/hutang?editId=${item.id}`}
                          onClick={() => console.log("Navigating to edit:", item.id)}
                          className="shrink-0 py-2 px-3 bg-white text-red-600 rounded-lg text-[9px] font-black uppercase shadow-sm hover:scale-105 active:scale-95 transition-all"
                        >
                          Lengkapi
                        </Link>
                      </div>
                    ))}
                  </div>

                  <p className="text-[8px] font-bold text-center opacity-50 italic uppercase tracking-widest mt-3">Selesaikan semua sebelum bayar</p>
                </div>
              )}

              <div className={hasUnpricedDebts ? 'opacity-40 pointer-events-none' : ''}>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Tanggal Bayar</label>
                <input type="date" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm outline-none" value={formData.tanggal_transaksi} onChange={(e) => setFormData({ ...formData, tanggal_transaksi: e.target.value })}/>
              </div>

              <div className={hasUnpricedDebts ? 'opacity-40 pointer-events-none' : ''}>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Jumlah Bayar (Rp)</label>
                <input type="number" placeholder="0" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-black text-2xl text-green-600 outline-none" value={formData.jumlah_bayar} onChange={(e) => setFormData({ ...formData, jumlah_bayar: e.target.value })}/>
              </div>

              <button type="submit" disabled={loading || !selectedPelanggan || hasUnpricedDebts} className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-lg transition-all ${(!selectedPelanggan || hasUnpricedDebts) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white shadow-lg hover:bg-green-700 active:scale-95'}`}>
                {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                {loading ? 'Memproses...' : 'Konfirmasi Bayar'}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function BayarHutang() {
  return <Suspense fallback={null}><BayarHutangContent /></Suspense>;
}