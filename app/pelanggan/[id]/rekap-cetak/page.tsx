'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Printer, ChevronLeft, Calendar, User, Download, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useNotification } from '@/app/components/NotificationProvider';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { EscPosEncoder, connectPrinter, printData, isPrinterConnected, checkBluetoothSupport } from '@/app/lib/printer';

interface Pelanggan {
  id: string;
  nama: string;
  no_whatsapp: string;
  total_hutang_saat_ini: number;
}

interface CatatanHutang {
  id: string;
  jumlah_hutang: number;
  jumlah_bayar: number;
  created_at: string;
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

export default function CetakRekapHutangPage() {
  const params = useParams();
  const customerId = params.id as string;

  const [pelanggan, setPelanggan] = useState<Pelanggan | null>(null);
  const [groupedDebts, setGroupedDebts] = useState<GroupedHutang[]>([]);
  const [loading, setLoading] = useState(true);
  const [printingBluetooth, setPrintingBluetooth] = useState(false);
  const { showModalAlert } = useNotification();

  useEffect(() => {
    if (customerId) {
      fetchData();
    }
  }, [customerId]);

  async function fetchData() {
    setLoading(true);
    
    // Fetch Customer
    const { data: pData } = await supabase
      .from('pelanggan')
      .select('*')
      .eq('id', customerId)
      .single();

    if (pData) setPelanggan(pData);

    // Fetch Unpaid Debts for this customer
    const { data: hData } = await supabase
      .from('catatan_hutang')
      .select(`
        *,
        transaksi (
          catatan_barang,
          tanggal_transaksi
        )
      `)
      .eq('pelanggan_id', customerId)
      .eq('status_lunas', false)
      .order('created_at', { ascending: true }); // Oldest first for a statement

    if (hData && hData.length > 0) {
      // Group by date
      const groups: Record<string, GroupedHutang> = {};

      hData.forEach((item: any) => {
        // Use transaction date or created_at
        const dateStr = item.transaksi?.tanggal_transaksi || item.created_at;
        const dateObj = new Date(dateStr);
        // Create a sortable key (YYYY-MM-DD)
        const dateKey = format(dateObj, 'yyyy-MM-dd');

        if (!groups[dateKey]) {
          groups[dateKey] = {
            dateKey,
            dateLabel: format(dateObj, 'EEEE, dd MMMM yyyy', { locale: localeId }),
            items: [],
            subtotal: 0
          };
        }

        const sisa = item.jumlah_hutang - (item.jumlah_bayar || 0);
        groups[dateKey].items.push(item);
        groups[dateKey].subtotal += sisa;
      });

      // Convert to array and sort by date descending
      const sortedGroups = Object.values(groups).sort((a, b) => 
        new Date(b.dateKey).getTime() - new Date(a.dateKey).getTime()
      );

      setGroupedDebts(sortedGroups);
    }
    setLoading(false);
  }

  const handlePrint = () => {
    window.print();
  };

  const handleBluetoothPrint = async () => {
    if (!pelanggan || groupedDebts.length === 0) return;
    
    const support = checkBluetoothSupport();
    if (!support.supported) {
      showModalAlert(support.message || 'Bluetooth tidak didukung.', 'Fitur Tidak Tersedia');
      return;
    }

    setPrintingBluetooth(true);
    try {
      if (!isPrinterConnected()) {
        await connectPrinter();
      }

      const encoder = new EscPosEncoder();
      
      encoder.initialize()
        .alignCenter()
        .size(1, 1)
        .bold(true)
        .line('TOKO 3 PUTRA DIGITAL')
        .size(0, 0)
        .bold(true)
        .line('REKAP HUTANG')
        .bold(false)
        .newline(1)
        .alignLeft()
        .line(`Pelanggan: ${pelanggan.nama}`)
        .line(`Waktu Cetak: ${format(new Date(), 'dd-MM-yyyy HH:mm')}`)
        .dashedLine();

      groupedDebts.forEach(group => {
        encoder.newline(1)
          .bold(true)
          .line(group.dateLabel.toUpperCase())
          .bold(false);

        group.items.forEach(item => {
          const lines = (item.transaksi?.catatan_barang || 'Hutang').split(/,\s*/);
          lines.forEach(line => {
             if (line.trim()) encoder.line(line.trim());
          });
          
          const sisa = item.jumlah_hutang - (item.jumlah_bayar || 0);
          encoder.alignRight()
            .line(`Rp ${new Intl.NumberFormat('id-ID').format(sisa)}`)
            .alignLeft();
        });

        encoder.line('................................')
          .text('Subtotal')
          .alignRight()
          .text(`Rp ${new Intl.NumberFormat('id-ID').format(group.subtotal)}`)
          .newline(1)
          .alignLeft();
      });

      encoder.newline(1)
        .dashedLine()
        .bold(true)
        .size(1, 0)
        .text('TOTAL PIUTANG')
        .alignRight()
        .text(`Rp ${new Intl.NumberFormat('id-ID').format(pelanggan.total_hutang_saat_ini)}`)
        .size(0, 0)
        .newline(2)
        .alignCenter()
        .bold(false)
        .line('HARAP DISIMPAN SEBAGAI')
        .line('BUKTI TAGIHAN SAH')
        .newline(1)
        .line('Software by Mas Wahyu')
        .newline(4);

      await printData(encoder.getBuffer());
    } catch (error) {
       console.error(error);
    } finally {
      setPrintingBluetooth(false);
    }
  };

  const handleDownload = () => {
    showModalAlert('Untuk menyimpan sebagai PDF:\n1. Jendela Cetak akan terbuka.\n2. Ubah "Tujuan" (Destination) menjadi "Simpan sebagai PDF" (Save as PDF).\n3. Klik Simpan.', 'Simpan PDF');
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  if (loading) return <div className="p-20 text-center font-black">Menyiapkan rekap...</div>;
  if (!pelanggan) return <div className="p-20 text-center font-black text-red-500">Pelanggan tidak ditemukan.</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 print:bg-white print:py-0 landscape:py-4">
      
      {/* Controls - Hidden during print */}
      <div className="w-full max-w-[500px] flex justify-between items-center mb-8 px-4 print:hidden landscape:mb-4 landscape:px-2">
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
          
          <button 
            onClick={handleBluetoothPrint}
            disabled={printingBluetooth}
            className={`px-4 py-3 text-white rounded-2xl font-black shadow-lg transition-all flex items-center gap-2 landscape:px-3 landscape:py-2 landscape:rounded-xl landscape:text-xs ${
              printingBluetooth ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 shadow-green-100 hover:bg-green-700 active:scale-95'
            }`}
          >
            {printingBluetooth ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
            Cetak Rekap
          </button>

          <button 
            onClick={handlePrint}
            className="p-3 bg-white border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2 font-bold text-sm landscape:p-2 landscape:rounded-xl landscape:text-xs"
          >
            <FileText size={18} className="landscape:w-4 landscape:h-4" />
            Web
          </button>
        </div>
      </div>

      {/* Printable Receipt Container (Width optimized for 80mm thermal printers approx) */}
      <div 
        id="receipt-content" 
        className="bg-white w-full max-w-[500px] print:max-w-[80mm] print:w-[80mm] print:m-0 print:border-none print:shadow-none shadow-2xl rounded-3xl min-h-[600px] font-mono text-gray-800 relative overflow-hidden border border-gray-100"
      >
        
        {/* Top Decoration */}
        <div className="h-6 w-full bg-repeating-linear-gradient -translate-y-3" 
             style={{ 
               backgroundImage: 'repeating-linear-gradient(45deg, #f3f4f6 0, #f3f4f6 10px, white 10px, white 20px)' 
             }}>
        </div>

        {/* Content Padding */}
        <div className="px-6 pb-10 print:px-2 print:pb-4 landscape:px-4 landscape:pb-6">
          
          {/* Header */}
          <div className="text-center mb-6 print:mb-4 landscape:mb-4">
            <h2 className="text-3xl font-black text-blue-600 print:text-black tracking-tighter mb-1 print:text-xl landscape:text-2xl leading-tight">
              <span className="block text-[10px] font-black tracking-[0.4em] text-gray-400 mb-1 print:text-[8px] landscape:text-[9px]">TOKO</span>
              3 PUTRA DIGITAL
            </h2>
            <p className="text-sm font-bold tracking-widest text-gray-400 print:text-[10px] landscape:text-xs uppercase">REKAP HUTANG</p>
          </div>
          
          <div className="border-t-2 border-dashed border-gray-300 my-4 print:my-2 landscape:my-3"></div>

          {/* Customer Info */}
          <div className="mb-6 space-y-2 print:text-[10px] print:mb-4 landscape:mb-4 landscape:space-y-1">
            <div className="flex items-start gap-2 text-sm landscape:text-xs">
              <User size={16} className="text-gray-400 shrink-0 mt-0.5 print:hidden landscape:w-3 landscape:h-3" />
              <div>
                <span className="text-gray-500 font-bold block text-xs">Pelanggan:</span>
                <span className="font-black text-gray-900 text-base">{pelanggan.nama}</span>
              </div>
            </div>
            {pelanggan.no_whatsapp && (
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>WA: {pelanggan.no_whatsapp}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
              <span>Waktu Cetak:</span>
              <span>{format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
            </div>
          </div>

          <div className="border-t-2 border-dashed border-gray-300 my-4 print:my-2 landscape:my-3"></div>

          {/* Grouped Debts List */}
          <div className="space-y-6 print:space-y-4 landscape:space-y-4">
            {groupedDebts.length === 0 ? (
               <div className="text-center py-6 text-gray-500 font-bold print:py-2">
                 Tidak ada tagihan tertunggak.
               </div>
            ) : (
                groupedDebts.map((group) => (
                  <div key={group.dateKey} className="bg-gray-50 rounded-xl p-3 print:bg-white print:p-0 print:border-b print:border-gray-200 print:rounded-none landscape:p-2 landscape:rounded-lg">
                    {/* Day Header */}
                    <div className="flex items-center gap-2 mb-3 border-b border-gray-200 pb-2 print:mb-1 print:pb-1 landscape:mb-2">
                      <Calendar size={14} className="text-gray-500 print:hidden landscape:w-3 landscape:h-3" />
                      <h4 className="font-black text-sm text-gray-800 print:text-[11px] landscape:text-xs uppercase">{group.dateLabel}</h4>
                    </div>

                    {/* Day Items */}
                    <ul className="space-y-2 print:space-y-1 landscape:space-y-1 mb-3 print:mb-2 landscape:mb-2">
                      {group.items.map((item) => {
                        const sisa = item.jumlah_hutang - (item.jumlah_bayar || 0);
                        return (
                          <li key={item.id} className="flex justify-between items-start text-sm print:text-[10px] landscape:text-xs">
                            <span className="text-gray-700 pr-2 leading-tight">
                              {(item.transaksi?.catatan_barang || 'Item Hutang').split(/,\s*/).map((line, idx) => (
                                <span key={idx} className="block">{line}</span>
                              ))}
                              {item.jumlah_bayar > 0 && (
                                <span className="block text-[10px] text-orange-500 font-bold print:text-[8px] mt-1">Telah dicicil: {formatRupiah(item.jumlah_bayar)}</span>
                              )}
                            </span>
                            <span className="font-bold text-gray-900 whitespace-nowrap self-end">{formatRupiah(sisa)}</span>
                          </li>
                        );
                      })}
                    </ul>

                    {/* Day Subtotal */}
                    <div className="flex justify-between items-center text-sm font-black text-indigo-700 pt-2 border-t border-gray-200 border-dashed print:text-[10px] print:text-black landscape:text-xs">
                      <span>Subtotal Harian</span>
                      <span>{formatRupiah(group.subtotal)}</span>
                    </div>
                  </div>
                ))
            )}
          </div>

          <div className="border-t-[3px] border-double border-gray-300 my-6 print:my-3 landscape:my-4"></div>

          {/* Grand Total */}
          <div className="bg-blue-50 p-4 rounded-2xl print:bg-transparent print:p-0 print:border-t-2 print:border-black print:rounded-none landscape:p-3 landscape:rounded-xl">
            <div className="flex justify-between items-center text-gray-600 mb-1 print:text-[10px] print:font-bold landscape:text-xs">
              <span>TOTAL PIUTANG</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-sm font-black text-blue-600 print:hidden landscape:text-xs">Rp</span>
              <span className="text-3xl font-black text-blue-800 tracking-tight print:text-xl print:text-black landscape:text-xl">
                {new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(pelanggan.total_hutang_saat_ini)}
              </span>
            </div>
          </div>

          <div className="border-t-2 border-dashed border-gray-300 my-6 print:hidden landscape:my-4"></div>

          {/* Footer message */}
          <div className="text-center mt-6 text-xs text-gray-400 font-bold leading-relaxed print:text-[9px] print:mt-4 landscape:mt-4 landscape:text-[10px]">
            <p>HARAP DISIMPAN SEBAGAI BUKTI TAGIHAN</p>
            <p className="mt-1 font-medium">Terima kasih atas kerja samanya.</p>
          </div>
          
        </div>
        
        {/* Bottom Decoration */}
        <div className="h-4 w-full bg-gray-100 absolute bottom-0 print:hidden"></div>
      </div>
    </div>
  );
}
