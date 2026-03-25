'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Printer, ChevronLeft, Calendar, User, ShoppingBag, Wallet, Download, Loader2, MessageCircle } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useNotification } from '@/app/components/NotificationProvider';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { EscPosEncoder, connectPrinter, printData, isPrinterConnected } from '@/app/lib/printer';

interface Transaksi {
  id: string;
  tipe_transaksi: string;
  total_harga: number;
  catatan_barang: string;
  tanggal_transaksi: string;
  created_at: string;
  pelanggan_id: string;
  pelanggan: {
    nama: string;
    no_whatsapp: string;
    total_hutang_saat_ini: number;
  };
}

interface CatatanHutang {
  catatan_barang: string;
  total_harga: number;
  tanggal_transaksi: string;
}

export default function StrukPage() {
  const params = useParams();
  const transId = params.id as string;
  const receiptRef = useRef<HTMLDivElement>(null);

  const [transaksi, setTransaksi] = useState<Transaksi | null>(null);
  const [hutangLama, setHutangLama] = useState<CatatanHutang[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [printingBluetooth, setPrintingBluetooth] = useState(false);
  const { showModalAlert } = useNotification();

  useEffect(() => {
    if (transId) {
      fetchData();
    }
  }, [transId]);

  async function fetchData() {
    setLoading(true);
    const { data: transData, error: transError } = await supabase
      .from('transaksi')
      .select(`
        *,
        pelanggan (
          nama,
          no_whatsapp,
          total_hutang_saat_ini
        )
      `)
      .eq('id', transId)
      .single();

    if (!transError && transData) {
      setTransaksi(transData);
      if (transData.pelanggan_id) {
        const { data: olderDebts } = await supabase
          .from('transaksi')
          .select('catatan_barang, total_harga, tanggal_transaksi')
          .eq('pelanggan_id', transData.pelanggan_id)
          .eq('tipe_transaksi', 'HUTANG')
          .neq('id', transId)
          .order('tanggal_transaksi', { ascending: false })
          .limit(5);
        setHutangLama(olderDebts || []);
      }
    }
    setLoading(false);
  }

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // html2canvas is fundamentally incompatible with Tailwind v4's modern CSS.
    // The most reliable, platform-agnostic way to get a perfect PDF of a modern web page
    // is to use the browser's native print-to-pdf engine.
    
    // We trigger the same print dialog, but show a helpful toast guiding them to save as PDF.
    showModalAlert('Untuk menyimpan sebagai PDF:\n1. Jendela Cetak akan terbuka.\n2. Ubah "Tujuan" (Destination) menjadi "Simpan sebagai PDF" (Save as PDF).\n3. Klik Simpan.', 'Simpan PDF');
    
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleWhatsApp = () => {
    if (!transaksi) return;
    
    const nama = transaksi.pelanggan?.nama || 'Pelanggan';
    const noWa = transaksi.pelanggan?.no_whatsapp;
    
    if (!noWa) {
      showModalAlert('Nomor WhatsApp pelanggan belum terdaftar.', 'WhatsApp Error');
      return;
    }

    const isPayment = transaksi.tipe_transaksi === 'TUNAI' && transaksi.catatan_barang.toLowerCase().includes('bayar');
    const prevBalance = transaksi.pelanggan?.total_hutang_saat_ini + transaksi.total_harga;
    
    const formattedTotal = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(transaksi.total_harga);
    const formattedSisa = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(transaksi.pelanggan?.total_hutang_saat_ini || 0);
    const formattedPrev = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(prevBalance);

    let infoHutang = "";
    if (isPayment) {
      infoHutang = `*Rincian Hutang:*%0A` +
        `- Hutang Awal: ${formattedPrev}%0A` +
        `- Bayar: ${formattedTotal}%0A` +
        `👉 *SISA HUTANG: ${formattedSisa}*`;
    } else {
      infoHutang = `*INFO TOTAL HUTANG:*%0A` +
        `👉 *${formattedSisa}*`;
    }

    const message = `*NOTA 3 PUTRA DIGITAL*%0A` +
      `----------------------------%0A` +
      `Haloo Kak *${nama}*,%0A` +
      `Berikut detail transaksi Anda:%0A%0A` +
      `*Barang:* ${transaksi.catatan_barang}%0A` +
      `*Total:* ${formattedTotal}%0A` +
      `*Status:* ${transaksi.tipe_transaksi}%0A%0A` +
      `${infoHutang}%0A%0A` +
      `----------------------------%0A` +
      `_Terima kasih sudah belanja!_`;

    // Clean phone number (remove +, spaces, etc)
    const cleanNoWa = noWa.replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${cleanNoWa.startsWith('0') ? '62' + cleanNoWa.slice(1) : cleanNoWa}?text=${message}`;
    
    window.open(waUrl, '_blank');
  };

  const handleBluetoothPrint = async () => {
    if (!transaksi) return;
    
    setPrintingBluetooth(true);
    try {
      // Connect if not already connected
      if (!isPrinterConnected()) {
        await connectPrinter();
      }

      const encoder = new EscPosEncoder();
      const nama = transaksi.pelanggan?.nama || 'UMUM';
      const date = format(new Date(transaksi.created_at), 'dd-MM-yyyy');
      const time = format(new Date(transaksi.created_at), 'HH:mm');
      const idStr = transaksi.id.split('-')[0].toUpperCase();

      encoder.initialize()
        .alignCenter()
        .size(1, 1) // Double size
        .bold(true)
        .line('3 PUTRA DIGITAL')
        .size(0, 0) // Normal size
        .bold(false)
        .line('Solusi Hutang & Kasir')
        .newline(1)
        .alignLeft()
        .line(`No: #${idStr}`)
        .line(`Tgl: ${date} ${time}`)
        .dashedLine()
        .line(`Pelanggan: ${nama}`)
        .newline(1)
        .bold(true)
        .line(transaksi.tipe_transaksi === 'TUNAI' && transaksi.catatan_barang.toLowerCase().includes('bayar') 
          ? 'PELUNASAN / BAYAR:'
          : 'PESANAN:')
        .bold(false)
        .line(transaksi.catatan_barang)
        .newline(1)
        .dashedLine()
        .size(0, 0)
        .bold(true)
        .text('TOTAL: ')
        .alignRight()
        .text(`Rp ${new Intl.NumberFormat('id-ID').format(transaksi.total_harga)}`)
        .newline(1)
        .alignLeft()
        .bold(false)
        .line(`Metode: ${transaksi.tipe_transaksi}`)
        .dashedLine();

      if (transaksi.pelanggan) {
        encoder.bold(true)
          .line('SISA HUTANG:')
          .size(1, 1)
          .line(`Rp ${new Intl.NumberFormat('id-ID').format(transaksi.pelanggan.total_hutang_saat_ini)}`)
          .size(0, 0)
          .bold(false)
          .dashedLine();
      }

      encoder.newline(1)
        .alignCenter()
        .line('Terima Kasih!')
        .line('Software by Digital Store')
        .newline(4); // Feed some paper

      await printData(encoder.getBuffer());
    } catch (error: any) {
      if (error.name !== 'NotFoundError' && error.name !== 'AbortError') {
        showModalAlert('Gagal mencetak: ' + (error.message || 'Bluetooth Error'), 'Printer Error');
      }
    } finally {
      setPrintingBluetooth(false);
    }
  };

  if (loading) return <div className="p-20 text-center font-black">Menyiapkan struk...</div>;
  if (!transaksi) return <div className="p-20 text-center font-black text-red-500">Struk tidak ditemukan.</div>;

  return (
    <div className="w-full flex flex-col flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-gray-50 items-center py-10 print:bg-white print:py-0 landscape:py-4">
      
      {/* Controls - Hidden during print */}
      <div className="w-full max-w-[400px] flex justify-between items-center mb-8 px-4 print:hidden landscape:mb-4 landscape:px-2">
        <button 
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-bold transition-all landscape:text-xs"
        >
          <ChevronLeft size={20} className="landscape:w-4 landscape:h-4" />
          Kembali
        </button>
        <div className="flex gap-2">
          <button 
            onClick={handleDownload}
            className="p-3 bg-white border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2 font-bold text-sm landscape:p-2 landscape:rounded-xl landscape:text-xs"
          >
            <Download size={18} className="landscape:w-4 landscape:h-4" />
            PDF
          </button>
          
          {transaksi.pelanggan?.no_whatsapp && (
            <button 
              onClick={handleWhatsApp}
              className="p-3 bg-green-50 border border-green-100 text-green-600 rounded-2xl hover:bg-green-100 transition-all shadow-sm flex items-center gap-2 font-bold text-sm landscape:p-2 landscape:rounded-xl landscape:text-xs"
              title="Kirim ke WhatsApp"
            >
              <MessageCircle size={18} className="landscape:w-4 landscape:h-4" />
              WA
            </button>
          )}

          <button 
            onClick={handleBluetoothPrint}
            disabled={printingBluetooth}
            className={`px-4 py-3 border border-blue-600 rounded-2xl font-black shadow-sm transition-all flex items-center gap-2 text-xs landscape:px-3 landscape:py-2 landscape:rounded-xl landscape:text-[10px] ${
              printingBluetooth ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-blue-600 hover:bg-blue-50 active:scale-95'
            }`}
            title="Cetak via Bluetooth Thermal"
          >
            {printingBluetooth ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
            BT
          </button>

          <button 
            onClick={handlePrint}
            className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2 landscape:px-4 landscape:py-2 landscape:rounded-xl landscape:text-xs"
          >
            <Printer size={18} className="landscape:w-4 landscape:h-4" />
            Cetak
          </button>
        </div>
      </div>

      {/* The Actual Receipt Container */}
      <div 
        ref={receiptRef}
        id="receipt-content"
        className="receipt-paper bg-white w-[380px] p-8 shadow-2xl print:shadow-none print:w-full print:p-4 landscape:w-[320px] landscape:p-4 text-xs landscape:text-[10px]"
      >
        {/* Header */}
        <div className="text-center mb-10 border-b border-dashed border-gray-300 pb-8">
          <h1 className="text-3xl font-black tracking-tighter text-gray-900 mb-1">3 PUTRA DIGITAL</h1>
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4">Solusi Catat Hutang & Kasir</p>
          
          <div className="flex flex-col gap-1 text-[11px] font-bold text-gray-500">
             <div className="flex justify-between border-t border-gray-100 pt-4 mt-2">
                <span>Tanggal:</span>
                <span className="text-gray-900">{format(new Date(transaksi.created_at), 'dd-MM-yyyy')}</span>
             </div>
             <div className="flex justify-between">
                <span>Waktu:</span>
                <span className="text-gray-900">{format(new Date(transaksi.created_at), 'HH:mm')} WIB</span>
             </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="mb-8 space-y-2">
           <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
              <span className="text-[10px] font-black text-gray-400 uppercase">Pelanggan:</span>
              <span className="text-sm font-black text-gray-900">{transaksi.pelanggan?.nama || 'UMUM'}</span>
           </div>
           <p className="text-[9px] text-center text-gray-400 font-bold uppercase tracking-widest">NO: #{transaksi.id.split('-')[0].toUpperCase()}</p>
        </div>

        {/* Items */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4 justify-between">
             <div className="flex items-center gap-2">
               <ShoppingBag size={14} className="text-gray-400" />
               <h3 className="text-[11px] font-black uppercase text-gray-800 tracking-wider">
                 {transaksi.tipe_transaksi === 'TUNAI' && transaksi.catatan_barang.toLowerCase().includes('bayar') 
                   ? 'Detail Pembayaran' 
                   : 'Detail Pesanan'}
               </h3>
             </div>
          </div>
          <div className="space-y-4">
             <div className="flex flex-col gap-1">
                <p className="text-sm font-bold text-gray-800 leading-relaxed whitespace-pre-wrap">
                   {transaksi.catatan_barang?.replace(/,/g, '\n')}
                </p>
                <div className="flex justify-between items-center border-t border-gray-50 pt-2 mt-1">
                   <span className="text-[10px] font-black text-gray-400 uppercase">Harga</span>
                   <p className="text-sm font-black text-gray-900">
                      {new Intl.NumberFormat('id-ID').format(transaksi.total_harga)}
                   </p>
                </div>
             </div>
          </div>
        </div>

        {/* Totals */}
        <div className="border-t-[3px] border-double border-gray-900 pt-6 mb-10">
           <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-black text-gray-900">SUBTOTAL</span>
              <span className="text-sm font-black text-gray-900">Rp {new Intl.NumberFormat('id-ID').format(transaksi.total_harga)}</span>
           </div>
           <div className="flex justify-between items-center py-4 bg-gray-900 text-white px-4 rounded-xl">
              <span className="text-xs font-black uppercase tracking-widest">TOTAL</span>
              <span className="text-xl font-black">Rp {new Intl.NumberFormat('id-ID').format(transaksi.total_harga)}</span>
           </div>
           <div className="mt-4 flex justify-between items-center">
              <span className="text-[10px] font-black text-gray-400 uppercase">METODE</span>
              <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
                transaksi.tipe_transaksi === 'TUNAI' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {transaksi.tipe_transaksi}
              </span>
           </div>
        </div>

        {/* Debt Section */}
        {transaksi.pelanggan && (
          <div className="bg-red-50 p-6 rounded-3xl border border-red-100 mb-10">
            {transaksi.tipe_transaksi === 'TUNAI' && transaksi.catatan_barang.toLowerCase().includes('bayar') ? (
              // Specialized view for debt payment
              <div className="space-y-4">
                <div className="flex justify-between items-center text-red-600">
                  <span className="text-[10px] font-black uppercase tracking-widest">Hutang Sebelumnya</span>
                  <span className="text-sm font-black italic line-through opacity-50">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(transaksi.pelanggan.total_hutang_saat_ini + transaksi.total_harga)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-green-600 border-b border-red-200 border-dashed pb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest">Jumlah Dibayar</span>
                  <span className="text-sm font-black">
                    - {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(transaksi.total_harga)}
                  </span>
                </div>
                <div className="pt-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet size={16} className="text-red-500" />
                    <h3 className="text-[10px] font-black uppercase text-red-600 tracking-widest">Sisa Hutang Baru</h3>
                  </div>
                  <p className="text-3xl font-black text-red-700">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(transaksi.pelanggan.total_hutang_saat_ini)}
                  </p>
                </div>
              </div>
            ) : (
              // Default view for normal transactions
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Wallet size={16} className="text-red-500" />
                  <h3 className="text-[10px] font-black uppercase text-red-600 tracking-widest">Sisa Total Hutang</h3>
                </div>
                <p className="text-3xl font-black text-red-700">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(transaksi.pelanggan.total_hutang_saat_ini)}
                </p>
              </>
            )}
          </div>
        )}

        <div className="text-center space-y-2 border-t border-gray-100 pt-8 mt-4">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Terima Kasih Atas Belanja Anda</p>
           <p className="text-[8px] font-bold text-gray-300 italic">Software by Digital Store System</p>
        </div>

      </div>

      <style jsx global>{`
        @media print {
          /* Hide everything first */
          body * {
            visibility: hidden;
            background: white !important;
          }
          
          /* Show only the receipt */
          #receipt-content, #receipt-content * {
            visibility: visible;
          }
          
          /* Reset positions for print */
          #receipt-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 10mm !important;
            box-shadow: none !important;
            border: none !important;
          }
          
          .print\:hidden {
            display: none !important;
          }
          
          /* Remove header/footer from browser print */
          @page {
            margin: 0;
            size: auto;
          }
        }

        .receipt-paper {
          font-family: 'Courier New', Courier, monospace;
          /* Force clean look for thermal printer */
        }
      `}</style>
    </div>
  );
}
