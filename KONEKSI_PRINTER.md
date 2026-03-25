# Panduan Koneksi Printer Thermal (58mm)

Dokumen ini menjelaskan cara menghubungkan dan menggunakan mesin cetak struk Bluetooth dengan aplikasi **3 Putra Digital**.

## 📋 Persyaratan Sistem

Untuk menggunakan fitur cetak Bluetooth, pastikan perangkat Anda memenuhi syarat berikut:

1.  **Koneksi Aman (HTTPS)**: Browser (Chrome/Edge/Safari) hanya mengizinkan akses Bluetooth pada website yang menggunakan `https://`. 
    - Jika Anda mengakses via IP lokal (misal: `192.168.1.5`), fitur ini mungkin diblokir oleh browser.
2.  **Browser yang Didukung**: 
    - **Android/Windows/macOS**: Google Chrome atau Microsoft Edge versi terbaru.
    - **iOS**: Dukungan Web Bluetooth terbatas (Gunakan aplikasi pendukung atau akses via Chrome jika tersedia).
3.  **Printer**: Mesin thermal 58mm dengan dukungan ESC/POS (Contoh: MP-58N, RPP02N, dll).

---

## 🚀 Cara Menghubungkan Printer

1.  **Nyalakan Printer**: Pastikan lampu indikator printer menyala.
2.  **Aktifkan Bluetooth**: Pastikan Bluetooth pada HP atau Komputer Anda sudah menyala.
3.  **Buka Struk**: Masuk ke menu transaksi dan buka struk yang ingin dicetak.
4.  **Klik Tombol "BT"**: Klik tombol berwarna biru dengan ikon printer bertuliskan **BT** di pojok kanan atas.
5.  **Pilih Perangkat**: Akan muncul jendela daftar perangkat Bluetooth. Pilih nama printer Anda (biasanya `RPP02N`, `MP-58N`, atau `Printer001`).
6.  **Klik Hubungkan/Pair**: Printer akan mulai mencetak otomatis setelah terhubung.

---

## 🛠️ Pemecahan Masalah (Troubleshooting)

Jika printer tidak terdeteksi atau gagal mencetak:

-   **Printer Tidak Muncul di Daftar**: 
    - Pastikan printer tidak sedang terhubung ke perangkat lain.
    - Matikan dan nyalakan kembali printer Anda.
-   **Pesan "Keamanan Browser"**: 
    - Ini terjadi karena Anda tidak menggunakan HTTPS. Pastikan alamat website Anda dimulai dengan `https://`.
-   **Kertas Kosong setelah Cetak**:
    - Pastikan pemasangan kertas thermal sudah benar (sisi sensitif panas menghadap ke atas).
-   **Teks Berantakan**:
    - Sistem ini dioptimalkan untuk lebar kertas 58mm. Pastikan Anda menggunakan printer dengan spesifikasi tersebut.

---

## 📄 Spesifikasi Teknis
- **Lebar Kertas**: 58mm
- **Encoding**: ESC/POS
- **Karakter per Baris**: ~32 Karakter
- **Fitur Otomatis**: Cetak Sisa Hutang Pelanggan (jika ada).

---
*Dikembangkan oleh Digital Store System*
