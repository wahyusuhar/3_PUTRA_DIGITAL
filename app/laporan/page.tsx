'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Calendar, Search, FileText, ArrowUpRight, ArrowDownLeft, Printer, Edit, Trash2, X, Save, Loader2, ShoppingCart, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useNotification } from '@/app/components/NotificationProvider';
import { id } from 'date-fns/locale';
import Link from 'next/link';

interface Transaksi {
  id: string;
  pelanggan_id: string;
  tipe_transaksi: 'TUNAI' | 'HUTANG';
  total_harga: number;
  catatan_barang: string;
  tanggal_transaksi: string;
  created_at: string;
  pelanggan: {
    nama: string;
    total_hutang_saat_ini: number;
  };
}

export default function LaporanPage() {
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editingTrans, setEditingTrans] = useState<Transaksi | null>(null);
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
    fetchTransaksi();
  }, [date]);

  async function fetchTransaksi() {
    setLoading(true);
    const { data, error } = await supabase
      .from('transaksi')
      .select(`
        *,
        pelanggan (
          nama,
          total_hutang_saat_ini
        )
      `)
      .eq('tanggal_transaksi', date)
      .order('created_at', { ascending: false });

    if (!error) {
      setTransaksi(data || []);
    }
    setLoading(false);
  }

  const handleDelete = async (trans: Transaksi) => {
    const isConfirmed = await confirm(
      'Yakin ingin menghapus transaksi ini? Data hutang pelanggan akan ikut diperbarui.',
      'Hapus Transaksi',
      'delete'
    );
    if (!isConfirmed) return;

    setLoading(true);
    
    // 1. If it was HUTANG, sync customer balance
    if (trans.tipe_transaksi === 'HUTANG' && trans.pelanggan_id) {
      const newBalance = Math.max(0, (trans.pelanggan.total_hutang_saat_ini || 0) - trans.total_harga);
      await supabase
        .from('pelanggan')
        .update({ total_hutang_saat_ini: newBalance })
        .eq('id', trans.pelanggan_id);
      
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
      showToast('Gagal menghapus transaksi', 'error');
    } else {
      showToast('Transaksi berhasil dihapus!', 'transaction');
      fetchTransaksi();
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

  const handleEditClick = (trans: Transaksi) => {
    setEditingTrans(trans);
    setEditForm({
      total_harga: trans.total_harga.toString(),
      catatan_barang: trans.catatan_barang || '',
      tipe_transaksi: trans.tipe_transaksi
    });
    setEditItems(parseNotesToItems(trans.catatan_barang || ''));
    setIsEditing(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrans) return;

    setSubmitting(true);
    const newAmount = Number(editForm.total_harga);
    const oldAmount = editingTrans.total_harga;
    const newTipe = editForm.tipe_transaksi;
    const oldTipe = editingTrans.tipe_transaksi;

    // Logic: Sync balance and debt entries
    if (editingTrans.pelanggan_id) {
       // 1. Fetch LATEST balance from DB to prevent stale data overrides
       const { data: latestPelanggan } = await supabase
          .from('pelanggan')
          .select('total_hutang_saat_ini')
          .eq('id', editingTrans.pelanggan_id)
          .single();
       
       const currentBalance = latestPelanggan?.total_hutang_saat_ini || 0;
       let balanceAdj = 0;

       if (oldTipe === 'TUNAI' && newTipe === 'HUTANG') {
          // Changed to debt: Insert new debt record
          balanceAdj = newAmount;
          await supabase.from('catatan_hutang').insert([{
             pelanggan_id: editingTrans.pelanggan_id,
             transaksi_id: editingTrans.id,
             jumlah_hutang: newAmount,
             jumlah_bayar: 0,
             status_lunas: false,
             keterangan: editForm.catatan_barang
          }]);
       } 
       else if (oldTipe === 'HUTANG' && newTipe === 'TUNAI') {
          // Changed to cash: Delete existing debt record
          balanceAdj = -oldAmount;
          await supabase.from('catatan_hutang').delete().eq('transaksi_id', editingTrans.id);
       }
       else if (oldTipe === 'HUTANG' && newTipe === 'HUTANG') {
          // Remained debt: Update debt record and adjust balance delta
          balanceAdj = newAmount - oldAmount;
          await supabase.from('catatan_hutang').update({ 
             jumlah_hutang: newAmount,
             keterangan: editForm.catatan_barang
          }).eq('transaksi_id', editingTrans.id);
       }

       if (balanceAdj !== 0) {
          const updatedBalance = currentBalance + balanceAdj;
          await supabase.from('pelanggan').update({ total_hutang_saat_ini: updatedBalance }).eq('id', editingTrans.pelanggan_id);
       }
    }

    // Update Transaction
    await supabase.from('transaksi').update({
       total_harga: newAmount,
       catatan_barang: editForm.catatan_barang,
       tipe_transaksi: newTipe
    }).eq('id', editingTrans.id);

    setIsEditing(false);
    showToast('Transaksi berhasil diperbarui!', 'transaction', 'Transaksi Berhasil di simpan');
    fetchTransaksi();
    setSubmitting(false);
  };

  const totalTunai = transaksi
    .filter(t => t.tipe_transaksi === 'TUNAI')
    .reduce((acc, t) => acc + Number(t.total_harga), 0);

  const totalHutang = transaksi
    .filter(t => t.tipe_transaksi === 'HUTANG')
    .reduce((acc, t) => acc + Number(t.total_harga), 0);

  return (
    <div className="p-4 md:p-6 w-full flex flex-col h-full min-h-screen lg:h-screen overflow-y-auto lg:overflow-hidden lg:p-4">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">Rekapan Transaksi</h1>
          <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest opacity-60">Lihat laporan harian tokomu.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-gray-100">
          <Calendar className="text-blue-600 ml-1.5" size={16} />
          <input 
            type="date" 
            className="outline-none font-bold text-gray-700 p-1 text-xs"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between overflow-hidden relative">
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Tunai Masuk</p>
            <h3 className="text-base md:text-xl font-black text-green-600">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalTunai)}
            </h3>
          </div>
          <div className="p-2 bg-green-50 rounded-xl text-green-500">
            <ArrowUpRight size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between overflow-hidden relative">
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Hutang Baru</p>
            <h3 className="text-base md:text-xl font-black text-red-600">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalHutang)}
            </h3>
          </div>
          <div className="p-2 bg-red-50 rounded-xl text-red-500">
            <ArrowDownLeft size={20} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden landscape:rounded-xl flex-1 flex flex-col">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 landscape:p-3">
          <h2 className="font-bold text-gray-700 flex items-center gap-2 landscape:text-sm">
            <FileText size={20} className="text-blue-600 landscape:w-4 landscape:h-4" />
            Detail Transaksi - {format(new Date(date), 'EEEE, d MMMM yyyy', { locale: id })}
          </h2>
        </div>

        {loading ? (
          <div className="p-20 text-center landscape:p-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4 landscape:h-6 landscape:w-6 landscape:mb-2"></div>
            <p className="text-gray-500 font-medium landscape:text-xs">Sedang memuat data...</p>
          </div>
        ) : transaksi.length === 0 ? (
          <div className="p-20 text-center text-gray-400 font-medium italic landscape:p-6 landscape:text-xs">
            Tidak ada transaksi pada tanggal ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 landscape:text-[10px] bg-gray-50/50">
                  <th className="px-6 py-4 landscape:py-2 landscape:px-3">Waktu</th>
                  <th className="px-6 py-4 landscape:py-2 landscape:px-3">Pelanggan</th>
                  <th className="px-6 py-4 landscape:py-2 landscape:px-3">Tipe</th>
                  <th className="px-6 py-4 landscape:py-2 landscape:px-3">Keterangan</th>
                  <th className="px-6 py-4 text-right landscape:py-2 landscape:px-3">Nominal</th>
                  <th className="px-6 py-4 text-center landscape:py-2 landscape:px-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transaksi.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 text-sm font-medium text-gray-500 landscape:py-1.5 landscape:px-3 landscape:text-xs">
                      {format(new Date(t.created_at), 'HH:mm')}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800 landscape:py-1.5 landscape:px-3 landscape:text-xs">
                      {t.pelanggan?.nama || 'Umum'}
                    </td>
                    <td className="px-6 py-4 landscape:py-1.5 landscape:px-3">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full landscape:px-2 landscape:py-0.5 landscape:text-[8px] ${
                        t.tipe_transaksi === 'TUNAI' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {t.tipe_transaksi}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-600 italic landscape:py-1.5 landscape:px-3 landscape:text-xs whitespace-pre-wrap">
                      {t.catatan_barang}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-gray-800 landscape:py-1.5 landscape:px-3 landscape:text-xs">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(t.total_harga)}
                    </td>
                    <td className="px-6 py-4 text-center landscape:py-1.5 landscape:px-3">
                      <div className="flex justify-center gap-2 landscape:gap-1">
                        <Link 
                          href={`/transaksi/struk/${t.id}`}
                          className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all font-bold text-xs landscape:p-1.5 landscape:rounded-lg"
                          title="Struk"
                        >
                          <Printer size={16} className="landscape:w-4 landscape:h-4" />
                        </Link>
                        <button 
                          onClick={() => handleEditClick(t)}
                          className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all landscape:p-1.5 landscape:rounded-lg"
                          title="Edit"
                        >
                          <Edit size={16} className="landscape:w-4 landscape:h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(t)}
                          className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all landscape:p-1.5 landscape:rounded-lg"
                          title="Hapus"
                        >
                          <Trash2 size={16} className="landscape:w-4 landscape:h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                             TUNAI
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
                       {submitting ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                       Simpan Perubahan
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
