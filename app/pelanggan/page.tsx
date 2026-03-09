'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserPlus, Users, Edit, Trash2, Search, Plus, Wallet, BookOpen, ClipboardList, ArrowRight } from 'lucide-react';
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

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col h-full min-h-[calc(100vh-80px)] landscape:min-h-0 landscape:h-auto landscape:p-2">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 landscape:gap-2 landscape:mb-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 landscape:text-xl">Daftar Pelanggan</h1>
          <p className="text-gray-500 font-medium landscape:text-xs">Kelola data orang yang berhutang di sini.</p>
        </div>

        <div className="flex gap-3 landscape:gap-2 w-full md:w-auto">
          <Link 
            href="/hutang" 
            className="flex-1 md:flex-none justify-center items-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-2xl font-bold shadow-sm hover:bg-gray-50 transition-all active:scale-95 whitespace-nowrap landscape:px-3 landscape:py-1.5 landscape:rounded-xl landscape:text-xs hidden md:flex"
          >
            <ClipboardList size={20} className="text-red-500 landscape:w-4 landscape:h-4" />
            Rekapan Hutang
          </Link>
          <Link 
            href="/pelanggan/tambah" 
            className="flex-1 md:flex-none justify-center items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95 whitespace-nowrap landscape:px-3 landscape:py-1.5 landscape:rounded-xl landscape:text-xs flex"
          >
            <UserPlus size={20} className="landscape:w-4 landscape:h-4" />
            Tambah Pelanggan Baru
          </Link>
        </div>
      </div>

      <div className="mb-6 relative landscape:mb-3">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 landscape:pl-3">
          <Search size={20} className="landscape:w-4 landscape:h-4" />
        </div>
        <input
          type="text"
          placeholder="Cari nama atau WhatsApp..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium landscape:py-1.5 landscape:pl-9 landscape:pr-3 landscape:rounded-xl landscape:text-xs"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
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
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider landscape:py-2 landscape:px-3 landscape:text-[10px]">Nama</th>
                   <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider landscape:py-2 landscape:px-3 landscape:text-[10px]">No. WhatsApp</th>
                   <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider landscape:py-2 landscape:px-3 landscape:text-[10px]">Alamat</th>
                   <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider text-center landscape:py-2 landscape:px-3 landscape:text-[10px]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredPelanggan.map((p) => (
                  <tr key={p.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4 landscape:py-2 landscape:px-3">
                      <Link 
                        href={`/pelanggan/${p.id}/hutang`}
                        className="font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-2 group/name landscape:text-xs"
                      >
                        {p.nama}
                        <ArrowRight size={14} className="opacity-0 group-hover/name:opacity-100 transition-opacity landscape:w-3 landscape:h-3" />
                      </Link>
                    </td>
                    <td className="px-6 py-4 landscape:py-2 landscape:px-3">
                      <p className="text-gray-600 font-medium landscape:text-xs">{p.no_whatsapp || '-'}</p>
                    </td>
                    <td className="px-6 py-4 landscape:py-2 landscape:px-3">
                      <p className="text-gray-600 font-medium truncate max-w-xs landscape:text-xs landscape:max-w-[120px]">{p.alamat || '-'}</p>
                    </td>
                    <td className="px-6 py-4 landscape:py-2 landscape:px-3">
                      <div className="flex justify-center gap-2">
                        <Link 
                          href={`/pelanggan/edit/${p.id}`}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all landscape:p-1 landscape:rounded-lg"
                          title="Edit"
                        >
                          <Edit size={18} className="landscape:w-4 landscape:h-4" />
                        </Link>
                        <button 
                          onClick={() => handleDelete(p.id, p.nama)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-xl transition-all landscape:p-1 landscape:rounded-lg"
                          title="Hapus"
                        >
                          <Trash2 size={18} className="landscape:w-4 landscape:h-4" />
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
    </div>
  );
}
