'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserPlus, Users, Edit, Trash2, Search, Plus, Wallet, BookOpen, ClipboardList, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import { useNotification } from '@/app/components/NotificationProvider';

interface Pelanggan {
  id: string;
  nama: string;
  no_whatsapp: string;
  alamat: string;
  total_hutang_saat_ini: number;
  created_at: string;
}

export default function DaftarPelanggan() {
  const [pelanggan, setPelanggan] = useState<Pelanggan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const router = useRouter();
  const { showToast, playSound, confirm } = useNotification();

  useEffect(() => {
    fetchPelanggan();
  }, []);

  async function fetchPelanggan() {
    setLoading(true);
    const { data, error } = await supabase
      .from('pelanggan')
      .select('*')
      .order('nama', { ascending: true });

    if (error) {
      console.error('Error fetching pelanggan:', error);
    } else {
      setPelanggan(data || []);
    }
    setLoading(false);
  }

  async function handleDelete(id: string, nama: string) {
    const isConfirmed = await confirm(
      `Yakin ingin menghapus pelanggan "${nama}"?`,
      'Hapus Pelanggan',
      'delete'
    );
    
    if (isConfirmed) {
      const { error } = await supabase
        .from('pelanggan')
        .delete()
        .eq('id', id);

      if (error) {
        showToast('Gagal menghapus pelanggan', 'error');
      } else {
        showToast('Pelanggan berhasil dihapus!', 'member');
        setPelanggan(pelanggan.filter(p => p.id !== id));
      }
    }
  }

  const filteredPelanggan = pelanggan.filter(p => 
    p.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.no_whatsapp && p.no_whatsapp.includes(searchTerm))
  );

  const totalPages = Math.ceil(filteredPelanggan.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPelanggan.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="p-4 md:p-6 w-full flex flex-col h-full min-h-screen lg:h-screen overflow-y-auto lg:overflow-hidden lg:p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4 landscape:gap-1.5 landscape:mb-2">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">Daftar Pelanggan</h1>
          <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest opacity-60">Kelola data orang yang berhutang di sini.</p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <Link 
            href="/hutang" 
            className="flex-1 md:flex-none justify-center items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-bold shadow-sm hover:bg-gray-50 transition-all active:scale-95 whitespace-nowrap text-xs hidden md:flex"
          >
            <ClipboardList size={16} className="text-red-500" />
            Rekapan Hutang
          </Link>
          <Link 
            href="/pelanggan/tambah" 
            className="flex-1 md:flex-none justify-center items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95 whitespace-nowrap text-xs flex"
          >
            <UserPlus size={16} />
            Tambah Pelanggan Baru
          </Link>
        </div>
      </div>

      <div className="mb-4 relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
          <Search size={16} />
        </div>
        <input
          type="text"
          placeholder="Cari nama atau WhatsApp..."
          className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-bold text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-20 text-center landscape:p-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4 landscape:w-6 landscape:h-6 landscape:mb-2"></div>
            <p className="text-gray-500 font-medium font-italic landscape:text-xs">Memuat data pelanggan...</p>
          </div>
        ) : filteredPelanggan.length === 0 ? (
          <div className="p-20 text-center landscape:p-6">
            <div className="flex justify-center mb-4 landscape:mb-2">
              <div className="p-4 bg-gray-50 rounded-full text-gray-300 landscape:p-2">
                <Users size={48} className="landscape:w-8 landscape:h-8" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-700 landscape:text-sm">
              {searchTerm ? 'Pencarian Tidak Ditemukan' : 'Belum Ada Data'}
            </h3>
            <p className="text-gray-400 mt-2 font-medium landscape:text-xs landscape:mt-1">
              {searchTerm ? 'Coba cari dengan kata kunci lain.' : 'Klik tombol di atas untuk menambah pelanggan pertama Anda.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gradient-to-r from-blue-600 to-indigo-700">
                  <th className="px-6 py-3 text-xs font-black text-blue-50 uppercase tracking-widest border-b border-white/10 text-center w-12">No</th>
                  <th className="px-6 py-3 text-xs font-black text-blue-50 uppercase tracking-widest border-b border-white/10 landscape:py-1.5 landscape:px-3">Nama</th>
                   <th className="px-6 py-3 text-xs font-black text-blue-50 uppercase tracking-widest border-b border-white/10 landscape:py-1.5 landscape:px-3">No. WhatsApp</th>
                   <th className="px-6 py-3 text-xs font-black text-blue-50 uppercase tracking-widest border-b border-white/10 landscape:py-1.5 landscape:px-3">Alamat</th>
                   <th className="px-6 py-3 text-xs font-black text-blue-50 uppercase tracking-widest border-b border-white/10 text-center landscape:py-1.5 landscape:px-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {currentItems.map((p, index) => (
                  <tr 
                    key={p.id} 
                    onClick={() => router.push(`/pelanggan/${p.id}/hutang`)}
                    className="hover:bg-blue-50/50 transition-all duration-300 group animate-in fade-in slide-in-from-right-4 fill-mode-both cursor-pointer border-b border-gray-50"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <td className="px-6 py-2 text-center text-xs font-black text-gray-400">
                      {indexOfFirstItem + index + 1}
                    </td>
                    <td className="px-6 py-2 landscape:px-3 text-xs font-bold">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-600 rounded-lg font-bold text-[11px] ring-1 ring-green-100 group-hover:bg-green-600 group-hover:text-white transition-all shadow-sm">
                        {p.nama}
                        <ArrowRight size={12} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </span>
                    </td>
                    <td className="px-6 py-2 landscape:px-3 text-[11px] font-bold">
                      <p className="text-gray-600 font-bold">{p.no_whatsapp || '-'}</p>
                    </td>
                    <td className="px-6 py-2 landscape:px-3 text-[11px] font-bold">
                      <p className="text-gray-600 font-bold truncate max-w-xs landscape:max-w-[120px]">{p.alamat || '-'}</p>
                    </td>
                    <td className="px-6 py-4 landscape:py-2 landscape:px-3">
                      <div className="flex justify-center gap-1.5">
                        <Link 
                          href={`/pelanggan/edit/${p.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all relative z-10"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </Link>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(p.id, p.nama);
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-all relative z-10"
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && filteredPelanggan.length > itemsPerPage && (
          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between landscape:py-2">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
              Menampilkan {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredPelanggan.length)} dari {filteredPelanggan.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setCurrentPage(prev => Math.max(prev - 1, 1));
                  playSound?.('transaction');
                }}
                disabled={currentPage === 1}
                className="p-2 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-gray-400 transition-all shadow-sm active:scale-90"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentPage(i + 1);
                      playSound?.('transaction');
                    }}
                    className={`w-8 h-8 rounded-xl font-bold text-xs transition-all ${
                      currentPage === i + 1 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                      : 'bg-white border border-gray-100 text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
              </div>

              <button
                onClick={() => {
                  setCurrentPage(prev => Math.min(prev + 1, totalPages));
                  playSound?.('transaction');
                }}
                disabled={currentPage === totalPages}
                className="p-2 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-gray-400 transition-all shadow-sm active:scale-90"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
