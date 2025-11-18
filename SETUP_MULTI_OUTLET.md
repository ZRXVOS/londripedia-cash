# Setup LondriPediaCash - Multi Outlet Version

## 📋 Perubahan Utama

### Fitur Baru:
1. **2 Outlet**: LondriPedia dan Monyonyo
2. **Outlet Selector** di form input kasir
3. **Filter per outlet** untuk riwayat dan laporan
4. **Stats terpisah** untuk setiap outlet
5. **Transfer terpisah** per outlet
6. **Edit Nilai** saat validasi transaksi
7. **Audit trail** untuk transaksi yang diedit

---

## 🚀 Setup Google Sheets & Apps Script

### Step 1: Buat Google Spreadsheet Baru

1. Buka https://sheets.google.com
2. Klik **+ Blank** untuk membuat spreadsheet baru
3. Rename spreadsheet menjadi "LondriPediaCash MultiOutlet"

### Step 2: Buat 3 Sheets

Buat 3 sheets dengan nama berikut:

#### Sheet 1: **LondriPedia**
Header (Row 1):
```
ID | Outlet | Timestamp | Date | Amount | OriginalAmount | Note | EditReason | EditedBy | EditedAt | InputBy | Validated | Transferred | TransferDate
```

#### Sheet 2: **Monyonyo**
Header (Row 1):
```
ID | Outlet | Timestamp | Date | Amount | OriginalAmount | Note | EditReason | EditedBy | EditedAt | InputBy | Validated | Transferred | TransferDate
```

#### Sheet 3: **TransferHistory**
Header (Row 1):
```
ID | Outlet | Date | Count | Total | PeriodFrom | PeriodTo | Note
```

### Step 3: Setup Google Apps Script

1. Di Google Spreadsheet, klik **Extensions** > **Apps Script**
2. Delete semua code yang ada
3. Copy seluruh isi file `GOOGLE_APPS_SCRIPT_MULTI_OUTLET.gs`
4. Paste ke Apps Script editor
5. Klik **💾 Save** (atau Ctrl+S)
6. Rename project menjadi "LondriPediaCash API"

### Step 4: Deploy as Web App

1. Klik **Deploy** > **New deployment**
2. Klik ⚙️ (settings icon) > pilih **Web app**
3. Settings:
   - **Description**: "LondriPediaCash Multi Outlet API v1"
   - **Execute as**: Me (your email)
   - **Who has access**: Anyone
4. Klik **Deploy**
5. **Copy URL** yang muncul (contoh: `https://script.google.com/macros/s/AKfyc...`)
6. Klik **Done**

### Step 5: Update index.html

1. Buka file `index.html`
2. Cari baris yang berisi `GOOGLE_SHEETS_API_URL`
3. Replace URL lama dengan URL baru dari step 4
4. Save file

```javascript
const CONFIG = {
    GOOGLE_SHEETS_API_URL: 'PASTE_URL_ANDA_DISINI',
    SYNC_ENABLED: true,
    API_TIMEOUT: 15000,
    VERSION: '3.0-MultiOutlet',
    CRITICAL_AMOUNT_THRESHOLD: 5000000,
    OUTLETS: ['LondriPedia', 'Monyonyo']
};
```

---

## 📱 Cara Penggunaan

### Untuk KASIR/SPV:

1. **Login** dengan kode: `1`
2. **Pilih Outlet**: LondriPedia atau Monyonyo
3. **Input data** transaksi
4. **Filter riwayat** dengan tombol:
   - **Semua Outlet** - lihat semua transaksi
   - **LondriPedia** - lihat transaksi LondriPedia saja
   - **Monyonyo** - lihat transaksi Monyonyo saja

### Untuk OWNER:

1. **Login** dengan kode: `08625`

2. **Dashboard Overview**:
   - Stats **SEMUA OUTLET** ditampilkan
   - Stats **LONDRIPEDIA** ditampilkan
   - Stats **MONYONYO** ditampilkan

3. **Filter View** dengan tombol:
   - **Semua Outlet** - lihat semua transaksi
   - **LondriPedia** - lihat transaksi LondriPedia saja
   - **Monyonyo** - lihat transaksi Monyonyo saja

4. **Validasi Transaksi** (3 pilihan):
   - **✓ Validasi** - terima nilai sesuai input
   - **✏️ Edit Nilai** - sesuaikan nilai sebelum validasi
   - **❌ Tolak** - hapus transaksi

5. **Edit Nilai Transaksi**:
   - Klik tombol **✏️ Edit Nilai**
   - Masukkan **nilai baru**
   - Masukkan **alasan edit** (wajib)
   - Klik **💾 Simpan & Validasi**
   - Transaksi otomatis tervalidasi setelah diedit

6. **Transfer ke Rekening**:
   - Transfer **LondriPedia** dan **Monyonyo** dilakukan **terpisah**
   - Klik tombol **🏦 TRANSFER [OUTLET] KE REKENING**
   - Konfirmasi jumlah transaksi dan total

---

## 🔄 Data Flow

### Input Transaksi:
```
Kasir pilih outlet → Input data → Tersimpan di Google Sheet (LondriPedia/Monyonyo)
```

### Validasi:
```
Owner pilih transaksi:
  ├─ Validasi → Transaksi di-mark validated = true
  ├─ Edit Nilai → Update amount + set validated = true
  └─ Tolak → Hapus dari Google Sheet
```

### Transfer:
```
Owner klik transfer outlet X:
  → Semua transaksi validated & !transferred dari outlet X
  → Di-mark transferred = true
  → Tersimpan di TransferHistory sheet
```

---

## 📊 Struktur Data

### Transaction Object:
```javascript
{
  id: 1,
  outlet: "LondriPedia",          // NEW
  timestamp: "2025-11-18T10:30:00Z",
  date: "2025-11-18",
  amount: 500000,
  originalAmount: 550000,         // NEW (jika diedit)
  note: "Catatan kasir",
  editReason: "Koreksi input",    // NEW (jika diedit)
  editedBy: "Owner",              // NEW
  editedAt: "2025-11-18T11:00:00Z", // NEW
  inputBy: "SPV",
  validated: true,
  transferred: false,
  transferDate: null
}
```

### Transfer Record:
```javascript
{
  id: 1,
  outlet: "LondriPedia",          // NEW
  date: "2025-11-18",
  count: 5,
  total: 2500000,
  periodFrom: "2025-11-17",
  periodTo: "2025-11-18",
  note: "Transfer ke rekening bank - LondriPedia"
}
```

---

## 🐛 Troubleshooting

### 1. "Offline" Status
- Pastikan ada koneksi internet
- Test koneksi dengan tombol **🔗 Test Koneksi Google Sheets**

### 2. Sync Gagal
- Cek URL Google Apps Script sudah benar
- Cek deployment status di Apps Script
- Lihat debug log di panel Debug Console

### 3. Data Tidak Muncul
- Klik **🔄 Refresh Data dari Server**
- Periksa sheet sudah dibuat dengan nama yang benar
- Cek debug log untuk error messages

### 4. Edit Transaksi Gagal
- Pastikan alasan edit sudah diisi
- Cek koneksi internet
- Lihat error message di debug log

---

## 🔐 Kode Akses

- **Kasir/SPV**: `1`
- **Owner**: `08625`
- **Reset Data**: `08625` (sama dengan Owner)

---

## ⚠️ PENTING

1. **Backup Data**: Export Google Sheets secara berkala
2. **Jangan Share URL Apps Script**: URL deployment bersifat public, tapi data tetap aman
3. **Test Dulu**: Gunakan data dummy untuk testing sebelum data production
4. **Reset Data**: Hanya gunakan jika benar-benar perlu, data tidak bisa dikembalikan

---

## 📝 Version History

### Version 3.0 - Multi Outlet (Current)
- ✅ 2 Outlet support (LondriPedia & Monyonyo)
- ✅ Outlet selector untuk kasir
- ✅ Filter per outlet untuk semua view
- ✅ Stats terpisah per outlet
- ✅ Transfer terpisah per outlet
- ✅ Edit nilai transaksi saat validasi
- ✅ Audit trail untuk transaksi diedit
- ✅ 2 Google Sheets terpisah per outlet

### Version 2.4 - Debug (Previous)
- Debug panel
- Troubleshooting tools
- Single outlet only

---

## 📞 Support

Jika ada pertanyaan atau masalah, check:
1. Debug Console di aplikasi
2. Apps Script Logs: Apps Script Editor > Executions
3. Browser Console: F12 > Console tab

---

**Setup Complete! 🎉**

Aplikasi siap digunakan untuk 2 outlet dengan fitur lengkap validasi dan edit transaksi.
