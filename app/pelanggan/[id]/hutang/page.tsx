'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import { useNotification } from '@/app/components/NotificationProvider';
import { 
  ChevronLeft, 
  BookOpen,
  Wallet, 
  MessageCircle,
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar,
  Search,
  Printer,
  Loader2,
  Trash2,
  Plus,
  Edit,
  X,
  Save,
  Send,
  PieChart,
  ShoppingCart
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import Link from 'next/link';

interface Pelanggan {
  id: string;
  nama: string;
  no_whatsapp: string;
  total_hutang_saat_ini: number;
}

interface LedgerEntry {
  id: string;
  pelanggan_id: string;
  tanggal_transaksi: string;
  tipe_transaksi: string;
  total_harga: number;
  catatan_barang: string;
  created_at: string;
}

export default function BukuHutangPelanggan() {
  const params = useParams();
  const customerId = params.id as string;
  const router = useRouter();

  const [pelanggan, setPelanggan] = useState<Pelanggan | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editingTrans, setEditingTrans] = useState<LedgerEntry | null>(null);
  const [editForm, setEditForm] = useState({
    total_harga: '',
    catatan_barang: '',
    tipe_transaksi: 'TUNAI' as 'TUNAI' | 'HUTANG'
  });
  const [editItems, setEditItems] = useState<{ id: string; nama: string; harga: number }[]>([]);
  const [newEditItem, setNewEditItem] = useState({ nama: '', harga: '' });
  const { showToast, playSound, confirm } = useNotification();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (customerId) {
      fetchPelanggan();
    }
  }, [customerId]);

  async function fetchPelanggan() { // Renamed from fetchData
    setLoading(true);
    
    // 1. Fetch Pelanggan
    const { data: pData, error: pError } = await supabase
      .from('pelanggan')
      .select('*')
      .eq('id', customerId)
      .single();

    if (pError) {
      showToast('Pelanggan tidak ditemukan', 'error'); // Replaced alert
      router.push('/pelanggan');
      return;
    }
    setPelanggan(pData);

    // 2. Fetch all transactions for this customer
    const { data: tData, error: tError } = await supabase
      .from('transaksi')
      .select('*')
      .eq('pelanggan_id', customerId)
      .order('created_at', { ascending: false });

    if (!tError) {
      // Filter: Show all HUTANG, and TUNAI that are payments (contain 'Bayar' or similar)
      const ledgerEntries = (tData || []).filter(t => 
        t.tipe_transaksi === 'HUTANG' || 
        (t.tipe_transaksi === 'TUNAI' && t.catatan_barang?.toLowerCase().includes('bayar'))
      );
      setEntries(ledgerEntries);
    }

    setLoading(false);
  }

  const handleDelete = async (trans: LedgerEntry) => {
    const isConfirmed = await confirm(
      `Hapus transaksi "${trans.catatan_barang}"?`,
      'Hapus Transaksi',
      'delete'
    );
    if (!isConfirmed) return;

    setLoading(true);
    
    // 1. If it was HUTANG, sync customer balance
    if (trans.tipe_transaksi === 'HUTANG' && pelanggan) {
      const newBalance = Math.max(0, (pelanggan.total_hutang_saat_ini || 0) - trans.total_harga);
      await supabase
        .from('pelanggan')
        .update({ total_hutang_saat_ini: newBalance })
        .eq('id', customerId);
      
      await supabase
        .from('catatan_hutang')
        .delete()
        .eq('transaksi_id', trans.id);
    }

    // 2. Delete transaction
    const { error } = await supabase
      .from('transaksi')
      .delete()
      .eq('id', trans.id);

    if (error) {
      showToast('Gagal menghapus transaksi', 'error'); // Replaced alert
    } else {
      showToast('Transaksi berhasil dihapus!', 'transaction'); // Added showToast
      fetchPelanggan(); // Replaced fetchData
    }
    setLoading(false);
  };

  const parseNotesToItems = (notes: string) => {
    if (!notes || notes === 'Transaksi Penjualan') return [];
    
    // Split by comma (handles both ", " and ",")
    const parts = notes.split(/,\s*/);
    return parts.map(part => {
      part = part.trim();
      
      // 1. Try "Name (Price)" format
      const matchParens = part.match(/^(.*)\s*\(([\d.,]+)\)$/);
      if (matchParens) {
        return {
          id: Math.random().toString(36).substr(2, 9),
          nama: matchParens[1].trim(),
          harga: Number(matchParens[2].replace(/[^0-9]/g, ''))
        };
      }
      
      // 2. Try "Name Price" format (number at the end)
      const matchSpace = part.match(/^(.*)\s+(\d+)$/);
      if (matchSpace) {
        return {
          id: Math.random().toString(36).substr(2, 9),
          nama: matchSpace[1].trim(),
          harga: Number(matchSpace[2])
        };
      }
      
      // 3. Fallback: Entire part is name, price 0
      return {
        id: Math.random().toString(36).substr(2, 9),
        nama: part,
        harga: 0
      };
    }).filter(item => item.nama);
  };

  useEffect(() => {
    if (!isEditing) return;
    const total = editItems.reduce((acc, item) => acc + item.harga, 0);
    const notes = editItems.map(item => `${item.nama} (${item.harga.toLocaleString()})`).join(', ');
    
    setEditForm(prev => ({
      ...prev,
      total_harga: total.toString(),
      catatan_barang: notes || 'Transaksi Penjualan'
    }));
  }, [editItems, isEditing]);

  const addEditItem = () => {
    if (!newEditItem.nama.trim()) return;
    const item = {
      id: Math.random().toString(36).substr(2, 9),
      nama: newEditItem.nama.trim(),
      harga: newEditItem.harga ? Number(newEditItem.harga) : 0
    };
    setEditItems([...editItems, item]);
    setNewEditItem({ nama: '', harga: '' });
    playSound?.('transaction');
    
    setTimeout(() => {
      const nameInput = document.querySelector('input[placeholder="Nama Barang..."]') as HTMLInputElement;
      if (nameInput) nameInput.focus();
    }, 100);
  };

  const updateEditItem = (id: string, field: 'nama' | 'harga', value: any) => {
    setEditItems(editItems.map(item => 
      item.id === id ? { ...item, [field]: field === 'harga' ? Number(value) : value } : item
    ));
  };

  const removeEditItem = (id: string) => {
    setEditItems(editItems.filter(item => item.id !== id));
  };

  const handleEditClick = (trans: LedgerEntry) => {
    setEditingTrans(trans);
    setEditForm({
      total_harga: trans.total_harga.toString(),
      catatan_barang: trans.catatan_barang || '',
      tipe_transaksi: trans.tipe_transaksi as 'TUNAI' | 'HUTANG'
    });
    setEditItems(parseNotesToItems(trans.catatan_barang || ''));
    setIsEditing(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrans || !pelanggan) return;

    setSubmitting(true);
    const newAmount = Number(editForm.total_harga);
    const oldAmount = editingTrans.total_harga;
    const newTipe = editForm.tipe_transaksi;
    const oldTipe = editingTrans.tipe_transaksi;

    // Logic: Sync balance and debt entries
    let balanceAdj = 0;

    // Fetch LATEST balance from DB for pinpoint accuracy
    const { data: latestPelanggan } = await supabase
       .from('pelanggan')
       .select('total_hutang_saat_ini')
       .eq('id', customerId)
       .single();
    
    const currentBalance = latestPelanggan?.total_hutang_saat_ini || 0;

    if (oldTipe === 'TUNAI' && newTipe === 'HUTANG') {
      // Changed to debt
      balanceAdj = newAmount;
      await supabase.from('catatan_hutang').insert([{
         pelanggan_id: customerId,
         transaksi_id: editingTrans.id,
         jumlah_hutang: newAmount,
         jumlah_bayar: 0,
         status_lunas: false,
         keterangan: editForm.catatan_barang
      }]);
    } 
    else if (oldTipe === 'HUTANG' && newTipe === 'TUNAI') {
      // Changed to cash
      balanceAdj = -oldAmount;
      await supabase.from('catatan_hutang').delete().eq('transaksi_id', editingTrans.id);
    }
    else if (oldTipe === 'HUTANG' && newTipe === 'HUTANG') {
      // Remained debt, check delta
      balanceAdj = newAmount - oldAmount;
      await supabase.from('catatan_hutang').update({ 
         jumlah_hutang: newAmount,
         keterangan: editForm.catatan_barang
      }).eq('transaksi_id', editingTrans.id);
    }

    if (balanceAdj !== 0) {
      const updatedBalance = currentBalance + balanceAdj;
      await supabase.from('pelanggan').update({ total_hutang_saat_ini: updatedBalance }).eq('id', customerId);
    }

    // Update Transaction
    await supabase.from('transaksi').update({
       total_harga: newAmount,
       catatan_barang: editForm.catatan_barang,
       tipe_transaksi: newTipe
    }).eq('id', editingTrans.id);

    setIsEditing(false);
    showToast('Data berhasil diperbarui!', 'transaction', 'Transaksi Berhasil di simpan');
    fetchPelanggan(); // Replaced fetchData
    setSubmitting(false);
  };

  const handleWhatsApp = () => {
    if (!pelanggan) return;
    
    const noWa = pelanggan.no_whatsapp;
    if (!noWa) {
      showToast('Nomor WhatsApp pelanggan belum terdaftar.', 'info');
      return;
    }

    const formattedSisa = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(pelanggan.total_hutang_saat_ini);

    let listHutang = "";
    entries.slice(0, 10).forEach(e => {
        const typePrefix = e.tipe_transaksi === 'HUTANG' ? '[-] ' : '[+] ';
        listHutang += `${typePrefix} ${format(new Date(e.created_at), 'dd/MM')}: ${e.catatan_barang} (${e.total_harga.toLocaleString()})%0A`;
    });

    const message = `*BUKU HUTANG DIGITAL - 3 PUTRA*%0A` +
      `----------------------------%0A` +
      `Yth. *${pelanggan.nama}*%0A` +
      `Berikut adalah ringkasan buku hutang Anda:%0A%0A` +
      `${listHutang}%0A` +
      `*TOTAL SISA HUTANG:*%0A` +
      `👉 *${formattedSisa}*%0A%0A` +
      `----------------------------%0A` +
      `_Mohon segera diselesaikan, Terima kasih!_`;

    const cleanNoWa = noWa.replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${cleanNoWa.startsWith('0') ? '62' + cleanNoWa.slice(1) : cleanNoWa}?text=${message}`;
    window.open(waUrl, '_blank');
  };

  const filteredEntries = entries.filter(e => 
    e.catatan_barang?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
      <p className="text-gray-500 font-bold italic tracking-wider">Membuka Buku Hutang...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-6 w-full flex flex-col h-full min-h-screen lg:h-screen overflow-y-auto lg:overflow-hidden lg:p-4">
      {/* Header section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 landscape:gap-2 landscape:mb-3">
        <div className="flex items-center gap-4 landscape:gap-2">
          <Link href="/pelanggan" className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:bg-gray-50 transition-all landscape:p-1.5 landscape:rounded-xl">
            <ChevronLeft size={24} className="text-gray-600 landscape:w-5 landscape:h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1 landscape:mb-0 landscape:gap-1">
               <BookOpen size={20} className="text-indigo-600 landscape:w-4 landscape:h-4" />
               <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest landscape:text-[8px]">Buku Hutang Digital</span>
            </div>
            <h1 className="text-4xl font-black text-gray-800 tracking-tight landscape:text-xl">{pelanggan?.nama}</h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 landscape:gap-1.5">
          <Link 
            href={`/transaksi?pelangganId=${customerId}`}
            className="flex items-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 landscape:px-3 landscape:py-2 landscape:rounded-xl landscape:text-xs"
          >
            <Plus size={20} className="landscape:w-4 landscape:h-4" />
            Tambah Transaksi
          </Link>
          <Link 
            href={`/transaksi/bayar?pelangganId=${customerId}`}
            className="flex items-center gap-2 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 landscape:px-3 landscape:py-2 landscape:rounded-xl landscape:text-xs"
          >
            <Wallet size={20} className="landscape:w-4 landscape:h-4" />
            Bayar Hutang
          </Link>
          {pelanggan?.no_whatsapp && (
            <button 
              onClick={handleWhatsApp}
              className="flex items-center gap-2 px-6 py-4 bg-green-600 text-white rounded-2xl font-black shadow-lg shadow-green-100 hover:bg-green-700 transition-all active:scale-95 landscape:px-3 landscape:py-2 landscape:rounded-xl landscape:text-xs"
            >
              <MessageCircle size={20} className="landscape:w-4 landscape:h-4" />
              Kirim WA
            </button>
          )}
          <Link 
            href={`/pelanggan/${customerId}/rekap-cetak`}
            className="flex items-center gap-2 px-6 py-4 bg-gray-800 text-white rounded-2xl font-black shadow-lg shadow-gray-200 hover:bg-black transition-all active:scale-95 landscape:px-3 landscape:py-2 landscape:rounded-xl landscape:text-xs"
          >
            <Printer size={20} className="landscape:w-4 landscape:h-4" />
            Cetak Rekap
          </Link>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 md:gap-6 mb-6 md:mb-10 landscape:gap-2 landscape:mb-4">
        <div className="bg-white p-3 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-center items-center landscape:p-2 landscape:rounded-xl">
           <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 text-center landscape:text-[7px]">Saldo Hutang</p>
           <h2 className="text-sm md:text-4xl font-black text-red-600 text-center tracking-tighter landscape:text-xs">
             {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(pelanggan?.total_hutang_saat_ini || 0)}
           </h2>
        </div>
        
        <div className="bg-indigo-50 p-3 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-indigo-100 flex flex-col justify-center items-center landscape:p-2 landscape:rounded-xl">
            <p className="text-[8px] md:text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 text-center landscape:text-[7px]">Kasbon</p>
            <p className="text-lg md:text-3xl font-black text-indigo-700 landscape:text-base">{entries.filter(e => e.tipe_transaksi === 'HUTANG').length}</p>
        </div>

        <div className="bg-green-50 p-3 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-green-100 flex flex-col justify-center items-center landscape:p-2 landscape:rounded-xl">
            <p className="text-[8px] md:text-[10px] font-black text-green-400 uppercase tracking-widest mb-1 text-center landscape:text-[7px]">Bayar</p>
            <p className="text-lg md:text-3xl font-black text-green-700 landscape:text-base">{entries.filter(e => e.tipe_transaksi === 'TUNAI').length}</p>
        </div>
      </div>

      {/* Filter & List */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden landscape:rounded-xl flex-1 flex flex-col">
        <div className="p-6 border-b border-gray-50 flex items-center gap-4 landscape:p-3 landscape:gap-2">
           <Search className="text-gray-300 landscape:w-4 landscape:h-4" size={20} />
           <input 
              type="text" 
              placeholder="Cari transaksi atau pembayaran..."
              className="flex-1 outline-none font-bold text-gray-700 bg-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
             <thead className="bg-gray-50/50">
                <tr>
                   <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Waktu</th>
                   <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Keterangan</th>
                   <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Debit (+)</th>
                   <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Kredit (-)</th>
                   <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Aksi</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-50">
                {filteredEntries.map((e) => {
                  const isDebit = e.tipe_transaksi === 'HUTANG';
                  return (
                    <tr key={e.id} className="hover:bg-gray-50/50 transition-colors group">
                       <td className="px-8 py-4 whitespace-nowrap landscape:py-1.5 landscape:px-3">
                          <div className="flex items-center gap-3 landscape:gap-1.5">
                             <div className={`p-3 rounded-xl landscape:p-1.5 landscape:rounded-lg ${isDebit ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                                {isDebit ? <ArrowUpRight size={18} className="landscape:w-4 landscape:h-4" /> : <ArrowDownLeft size={18} className="landscape:w-4 landscape:h-4" />}
                             </div>
                             <div>
                                <p className="text-xs font-black text-gray-800 uppercase landscape:text-[10px]">{format(new Date(e.created_at), 'EEEE', { locale: localeId })}</p>
                                <p className="text-[10px] font-bold text-gray-400 landscape:text-[8px]">{format(new Date(e.created_at), 'dd MMM yyyy, HH:mm')}</p>
                             </div>
                          </div>
                       </td>
                       <td className="px-8 py-4 landscape:py-1.5 landscape:px-3">
                          <p className="text-sm font-bold text-gray-700 whitespace-pre-wrap landscape:text-xs">
                            {e.catatan_barang?.replace(/,/g, '\n')}
                          </p>
                       </td>
                       <td className="px-8 py-4 text-right landscape:py-1.5 landscape:px-3">
                          {isDebit ? (
                            <span className="text-sm font-black text-red-600 landscape:text-xs">
                               Rp {e.total_harga.toLocaleString()}
                            </span>
                          ) : '-'}
                       </td>
                       <td className="px-8 py-4 text-right landscape:py-1.5 landscape:px-3">
                          {!isDebit ? (
                            <span className="text-sm font-black text-green-600 landscape:text-xs">
                               Rp {e.total_harga.toLocaleString()}
                            </span>
                          ) : '-'}
                       </td>
                       <td className="px-8 py-4 landscape:py-1.5 landscape:px-3">
                          <div className="flex justify-center gap-2 landscape:gap-1">
                             <Link 
                                href={`/transaksi/struk/${e.id}`}
                                className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all landscape:p-1.5 landscape:rounded-lg"
                                title="Cetak Struk"
                             >
                                <Printer size={16} className="landscape:w-4 landscape:h-4" />
                             </Link>
                             <button 
                                onClick={() => handleEditClick(e)}
                                className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all landscape:p-1.5 landscape:rounded-lg"
                                title="Edit"
                             >
                                <Edit size={16} className="landscape:w-4 landscape:h-4" />
                             </button>
                             <button 
                                onClick={() => handleDelete(e)}
                                className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all landscape:p-1.5 landscape:rounded-lg"
                                title="Hapus"
                             >
                                <Trash2 size={16} className="landscape:w-4 landscape:h-4" />
                             </button>
                          </div>
                       </td>
                    </tr>
                  );
                })}
             </tbody>
          </table>
        </div>

        {filteredEntries.length === 0 && (
          <div className="p-20 text-center text-gray-400 font-bold italic">
             Tidak ada riwayat hutang/pembayaran yang sesuai.
          </div>
        )}
      </div>

      {/* Edit Transaction Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 landscape:max-w-lg landscape:rounded-xl">
              <div className="p-6 border-b flex justify-between items-center bg-gray-50/50 landscape:p-3">
                 <div>
                    <h3 className="text-xl font-black text-gray-800 landscape:text-sm">Edit Transaksi</h3>
                    <p className="text-xs font-bold text-gray-400 landscape:text-[10px]">ID: {editingTrans?.id.split('-')[0].toUpperCase()}</p>
                 </div>
                 <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-all landscape:p-1.5 landscape:rounded-lg">
                    <X size={24} className="landscape:w-4 landscape:h-4" />
                 </button>
              </div>

              <form onSubmit={handleUpdate} className="flex flex-col max-h-[calc(100vh-120px)] landscape:max-h-[calc(100vh-40px)]">
                 <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 landscape:p-3 landscape:space-y-3">
                    <div>
                       <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 landscape:text-[8px] landscape:mb-1.5">Tipe Transaksi</p>
                       <div className="grid grid-cols-2 gap-3 landscape:gap-1.5">
                          <button 
                             type="button"
                             onClick={() => setEditForm({ ...editForm, tipe_transaksi: 'TUNAI' })}
                             className={`p-4 rounded-2xl border-2 font-black text-sm flex items-center justify-center gap-2 transition-all landscape:p-2 landscape:rounded-lg landscape:text-[10px] landscape:gap-1 ${
                                editForm.tipe_transaksi === 'TUNAI' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-50 bg-gray-50 text-gray-400'
                             }`}
                          >
                             <ArrowUpRight size={18} className="landscape:w-4 landscape:h-4" />
                             PEMBAYARAN
                          </button>
                          <button 
                             type="button"
                             onClick={() => setEditForm({ ...editForm, tipe_transaksi: 'HUTANG' })}
                             className={`p-4 rounded-2xl border-2 font-black text-sm flex items-center justify-center gap-2 transition-all landscape:p-2 landscape:rounded-lg landscape:text-[10px] landscape:gap-1 ${
                                editForm.tipe_transaksi === 'HUTANG' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-50 bg-gray-50 text-gray-400'
                             }`}
                          >
                             <ArrowDownLeft size={18} className="landscape:w-4 landscape:h-4" />
                             HUTANG
                          </button>
                       </div>
                    </div>

                    <div className="border-b border-gray-100 pb-4 mb-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 landscape:text-[8px] landscape:mb-1">Tambah/Input Barang</label>
                       <div className="flex gap-2">
                           <input
                              type="text"
                              placeholder="Nama Barang..."
                              className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold landscape:p-1.5 landscape:text-xs"
                              value={newEditItem.nama}
                              onChange={(e) => setNewEditItem({ ...newEditItem, nama: e.target.value })}
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEditItem())}
                           />
                           <input
                              type="number"
                              placeholder="Harga"
                              className="w-24 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-blue-600 landscape:p-1.5 landscape:text-xs"
                              value={newEditItem.harga}
                              onChange={(e) => setNewEditItem({ ...newEditItem, harga: e.target.value })}
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEditItem())}
                           />
                          <button
                             type="button"
                             onClick={addEditItem}
                             className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-100"
                          >
                             <Plus size={18} />
                          </button>
                       </div>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-4 min-h-[150px] max-h-[300px] overflow-y-auto border border-gray-100 landscape:p-2 landscape:min-h-[100px] landscape:max-h-[150px]">
                       <div className="flex items-center gap-2 mb-3 border-b border-gray-200 pb-2 landscape:mb-1 landscape:pb-1">
                          <ShoppingCart size={14} className="text-gray-400" />
                          <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Daftar Barang ({editItems.length})</h4>
                       </div>
                       
                       {editItems.length === 0 ? (
                          <p className="text-center py-10 text-gray-400 font-bold italic text-xs landscape:py-4">Belum ada barang</p>
                       ) : (
                          <div className="space-y-2">
                             {editItems.map(item => (
                                <div key={item.id} className="flex gap-2 items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm transition-all hover:border-blue-200 landscape:p-2 landscape:rounded-lg">
                                   <input 
                                      type="text"
                                      className="flex-1 font-bold text-gray-800 text-sm outline-none bg-transparent landscape:text-xs"
                                      value={item.nama}
                                      onChange={(e) => updateEditItem(item.id, 'nama', e.target.value)}
                                   />
                                   <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg">
                                      <span className="text-[10px] font-black text-blue-400">Rp</span>
                                      <input 
                                         type="number"
                                         className="w-16 font-black text-blue-600 text-[11px] outline-none bg-transparent text-right"
                                         value={item.harga}
                                         onChange={(e) => updateEditItem(item.id, 'harga', e.target.value)}
                                      />
                                   </div>
                                   <button
                                      type="button"
                                      onClick={() => removeEditItem(item.id)}
                                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-all"
                                   >
                                      <Trash2 size={14} />
                                   </button>
                                </div>
                             ))}
                          </div>
                       )}
                    </div>

                    <div>
                       <div className="flex justify-between items-end mb-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Otomatis</label>
                          <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Rp</span>
                       </div>
                       <div className="w-full p-4 bg-blue-50 border border-blue-100 rounded-2xl font-black text-3xl text-blue-700 text-right shadow-inner landscape:text-xl landscape:p-2">
                          {Number(editForm.total_harga).toLocaleString()}
                       </div>
                    </div>
                 </div>

                 <div className="p-6 border-t bg-gray-50/50 landscape:p-3">
                    <button 
                       type="submit" 
                       disabled={submitting}
                       className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 landscape:py-2.5 landscape:text-sm landscape:rounded-lg landscape:gap-1.5"
                    >
                       {submitting ? <Loader2 className="animate-spin landscape:w-4 landscape:h-4" /> : <Save size={20} className="landscape:w-4 landscape:h-4" />}
                       Simpan Perubahan
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Instructions footer */}
      <footer className="mt-10 bg-gray-900 p-8 rounded-[2.5rem] text-white">
         <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-white/10 rounded-2xl">
                  <BookOpen className="text-white" size={24} />
               </div>
               <p className="text-sm font-medium opacity-70 max-w-sm">
                  Gunakan halaman ini sebagai bukti mutasi hutang yang sah kepada pelanggan. 
                  Anda bisa mengirimkan link atau screenshot ini ke WA pelanggan.
               </p>
            </div>
            <div className="text-center md:text-right">
               <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">Status Keanggotaan</p>
               <p className="text-lg font-black text-indigo-400">PELANGGAN AKTIF</p>
            </div>
         </div>
      </footer>
    </div>
  );
}
