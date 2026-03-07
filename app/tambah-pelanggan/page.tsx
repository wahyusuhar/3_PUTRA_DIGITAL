'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TambahPelanggan() {
  const [nama, setNama] = useState('');
  const [wa, setWa] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function simpanPelanggan(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Nanti kita akan buat API Route untuk simpan ke Postgres
    const res = await fetch('/api/pelanggan', {
      method: 'POST',
      body: JSON.stringify({ nama, wa }),
    });

    if (res.ok) {
      alert("Pelanggan Berhasil Disimpan!");
      router.push('/'); // Balik ke dashboard
    }
    setLoading(false);
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Tambah Pelanggan Baru</h1>
      
      <form onSubmit={simpanPelanggan} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nama Pelanggan</label>
          <input 
            type="text" 
            required
            className="w-full p-4 border rounded-xl text-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Contoh: Pak Haji Budi"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">No. WhatsApp</label>
          <input 
            type="number" 
            className="w-full p-4 border rounded-xl text-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="0812..."
            value={wa}
            onChange={(e) => setWa(e.target.value)}
          />
        </div>

        <button 
          disabled={loading}
          type="submit" 
          className="w-full bg-blue-600 text-white p-5 rounded-2xl font-bold text-xl shadow-lg active:scale-95 transition"
        >
          {loading ? 'Menyimpan...' : 'SIMPAN SEKARANG'}
        </button>
      </form>
    </div>
  );
}