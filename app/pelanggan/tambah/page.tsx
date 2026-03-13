'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, UserPlus, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useNotification } from '@/app/components/NotificationProvider';

export default function TambahPelanggan() {
  const router = useRouter();
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nama: '',
    no_whatsapp: '',
    alamat: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama) return showToast('Nama pelanggan harus diisi.', 'error');

    setLoading(true);
    const { error } = await supabase
      .from('pelanggan')
      .insert([
        { 
          nama: formData.nama, 
          no_whatsapp: formData.no_whatsapp, 
          alamat: formData.alamat,
          total_hutang_saat_ini: 0 
        }
      ]);

    if (error) {
      showToast('Gagal menambah pelanggan: ' + error.message, 'error');
      setLoading(false);
    } else {
      showToast('Pelanggan berhasil ditambahkan!', 'member');
      router.push('/pelanggan');
      router.refresh();
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <Link 
        href="/pelanggan" 
        className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 font-medium mb-6 transition-colors"
      >
        <ChevronLeft size={20} />
        Kembali ke Daftar
      </Link>

      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <UserPlus size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-800 tracking-tight">Tambah Pelanggan</h1>
            <p className="text-xs text-gray-500 font-medium">Lengkapi data pelanggan baru di bawah ini.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Nama Lengkap *</label>
            <input
              type="text"
              name="nama"
              required
              placeholder="Contoh: Budi Santoso"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-semibold text-gray-800 text-sm"
              value={formData.nama}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">No. WhatsApp</label>
            <input
              type="text"
              name="no_whatsapp"
              placeholder="Contoh: 08123456789 ( opsional )"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-semibold text-gray-800 text-sm"
              value={formData.no_whatsapp}
              onChange={handleChange}
            />
            <p className="text-xs text-gray-400 mt-2 italic font-medium">Gunakan format 0812 atau 62812 untuk fitur notifikasi.</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Alamat</label>
            <textarea
              name="alamat"
              rows={2}
              placeholder="Alamat lengkap pelanggan..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-semibold text-gray-800 text-sm resize-none"
              value={formData.alamat}
              onChange={handleChange}
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 hover:shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                Menyimpan Data...
              </>
            ) : (
              <>
                <Save size={24} />
                Simpan Pelanggan
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}