# Perencanaan Fitur: SEO Article Generator & Dashboard (MVP)

## 1. Latar Belakang & Tujuan (Goals)
Project ini sudah memiliki fondasi backend (**Bun + ElysiaJS + Drizzle ORM + MySQL**). Tahap berikutnya adalah membangun fitur inti aplikasi **Artikel SEO Automation** (terinspirasi alur kerja *co-pilot* gratis tanpa login seperti [RyRob AI Article Writer](https://www.ryrob.com/ai-article-writer/)) yang memenuhi tujuan utama berikut:

1. **Generator Artikel SEO >= 1.000 Kata dengan Kontrol Outline**: Mampu menghasilkan artikel SEO utuh dengan panjang **minimal 1.000 kata** dari kata kunci yang diberikan, lengkap dengan tahap peninjauan/pengeditan outline terlebih dahulu serta pengaturan **target audience** dan **tatanan bahasa** sesuai profil pembaca.
2. **Mode Hybrid: Gratis Langsung Pakai + BYOK via Dashboard**:
   - **Tanpa API Key (Mode Gratis)**: User yang baru membuka dashboard bisa **langsung membuat artikel secara gratis** memakai API *free-tier* bawaan server (dengan batas kuota harian per IP agar aman dari penyalahgunaan).
   - **Punya API Key Sendiri (BYOK)**: User dapat memasukkan **API Key, Provider/Base URL, dan Model LLM** milik sendiri langsung melalui dashboard untuk penggunaan **tanpa batas kuota aplikasi** dan kebebasan memilih model.
3. **Dashboard Sederhana Anti-AI-Slop**: Seluruh alur pembuatan, pemeriksaan kualitas SEO, penyuntingan, dan ekspor artikel dijalankan melalui dashboard web sederhana bergaya editorial yang tenang — **bukan** tampilan generik bertema AI (anti-AI-slop).
4. **Cakupan Fitur Terukur**: Memfokuskan implementasi pada fitur inti yang benar-benar diperlukan agar mudah dikerjakan oleh junior programmer maupun model AI yang lebih murah.

---

## 2. Daftar Fitur yang Diperlukan (Scope & Prioritas)

### A. Fitur Inti (Wajib Diimplementasikan — MVP)

| # | Fitur | Deskripsi Singkat |
|---|---|---|
| 1 | **Mode Hybrid LLM (Gratis Server + BYOK Dashboard)** | User tanpa API Key langsung bisa generate artikel gratis memakai API *free-tier* server (misal Google Gemini Free Tier / Groq / OpenRouter `:free`) dengan batas harian (`FREE_DAILY_LIMIT`, default `3` artikel/hari per IP). User yang memasukkan API Key sendiri di dashboard (*OpenAI, OpenRouter, Gemini, Groq, Custom/Ollama*) bebas dari batas kuota aplikasi dan dilengkapi tombol **Test Koneksi**. |
| 2 | **Alur Penulisan Interaktif (Keyword -> Edit Outline -> Artikel >= 1.000 Kata)** | Mengikuti pola efektif ala *RyRob AI Article Writer*: user dapat membuat **Outline (Judul SEO + H2/H3)** terlebih dahulu, mengedit/menambah/menghapus poin outline, lalu men-generate artikel penuh minimal **1.000 kata** dengan *Auto-Expand Guardrail* (tersedia juga tombol pintas "Langsung Tulis Artikel"). |
| 3 | **Konfigurasi Target Audience & Tatanan Bahasa** | User menentukan target pembaca, gaya bahasa/tone (*Informatif/Edukasi, Profesional/Formal, Santai/Kasual, Conversational/Ramah, Persuasif, Otoritatif/Analitis, Storytelling*), sudut pandang sapaan (POV: Anda/Kamu/Netral), bahasa artikel (ID/EN), target panjang (`>= 1000` kata), kata kunci pendukung (LSI), dan instruksi tambahan. |
| 4 | **Preset Profil Pembaca (Audience & Style Presets)** | Menyimpan dan memilih ulang kombinasi target audience + tatanan bahasa (dilengkapi 4 preset bawaan) agar user tidak perlu mengetik ulang pengaturan setiap kali membuat artikel. |
| 5 | **SEO Quality & Readability Analyzer** | Pemeriksaan otomatis deterministik di backend (tanpa LLM) untuk menghitung jumlah kata bersih, waktu baca, *keyword density*, penempatan keyword (Judul, Meta, Slug, H1, paragraf pembuka, H2), struktur heading, panjang meta tag, dan skor SEO (`0–100`). |
| 6 | **Manajemen Artikel & Editor Sederhana** | Daftar artikel tersimpan di MySQL dengan pencarian & filter status, tampilan **Preview (Markdown ter-render)** dan **Edit (Markdown + Metadata SEO)**, simpan perubahan dengan kalkulasi ulang metrik SEO otomatis, serta hapus artikel. |
| 7 | **Expand & Export Artikel** | Tombol **Perpanjang Artikel (Expand)** untuk menambah kedalaman isi, serta fitur **Copy Markdown**, **Copy HTML** (siap tempel ke WordPress/CMS), **Copy Metadata SEO**, dan **Download `.md` / `.html`**. |
| 8 | **Dashboard Web Anti-AI-Slop** | Antarmuka web satu aplikasi (dilayani langsung oleh ElysiaJS) bergaya *Editorial Publishing Desk* yang bersih, bebas friksi (tanpa login), dan bebas dari klise desain AI. |

### B. Di Luar Cakupan Saat Ini (Out of Scope — Fase Berikutnya)
Jangan mengimplementasikan hal-hal berikut di tahap ini agar implementasi tetap ramping:
- Sistem login / autentikasi / multi-user.
- Auto-publish langsung ke WordPress, Ghost, atau CMS eksternal.
- Scraping SERP Google, riset web *real-time*, atau integrasi API berbayar (Ahrefs/Semrush).
- Pembuatan gambar (AI Image Generation) untuk artikel.
- Memisahkan frontend ke framework SPA/SSR berat (Next.js/React/Vite terpisah). Cukup gunakan HTML/CSS/Vanilla JS modern yang dilayani langsung oleh ElysiaJS agar hanya butuh satu server (`bun run dev`).

---

## 3. Arsitektur & Kontrak Teknis

### 3.1. Perubahan Database Schema (`src/db/schema.ts`)
Perluas schema MySQL yang sudah ada (lalu buat migrasi baru via `bun run db:generate`):

1. **Tabel `articles`** (perluas tabel eksisting):
   - `id`: primary key (`serial`)
   - `keyword`: `varchar(255)` NOT NULL (kata kunci utama)
   - `secondaryKeywords`: `text` (kata kunci pendukung / LSI, dipisah koma atau JSON)
   - `title`: `varchar(255)` NOT NULL (SEO Title)
   - `slug`: `varchar(255)` NOT NULL (URL slug)
   - `metaDescription`: `varchar(320)` (Meta Description)
   - `targetAudience`: `varchar(255)` NOT NULL (misal: "Pemilik UMKM pemula")
   - `languageStyle`: `varchar(100)` NOT NULL (misal: "informatif", "profesional", "santai", "conversational", "persuasif", "otoritatif", "storytelling")
   - `language`: `varchar(10)` DEFAULT `'id'` (`'id'` atau `'en'`)
   - `pov`: `varchar(50)` DEFAULT `'anda'` (misal: `'anda'`, `'kamu'`, `'netral'`, `'kami'`)
   - `customInstructions`: `text` (catatan gaya/brand voice opsional)
   - `targetWordCount`: `int` DEFAULT `1200` (minimal `1000`)
   - `outline`: `longtext` (JSON outline final yang dipakai untuk menulis artikel)
   - `content`: `longtext` (isi artikel dalam format Markdown — **wajib `longtext`**, bukan `text`, agar artikel panjang tidak terpotong)
   - `wordCount`: `int` DEFAULT `0`
   - `seoScore`: `int` DEFAULT `0`
   - `seoReport`: `longtext` (JSON hasil analisis SEO dari analyzer)
   - `status`: `varchar(32)` DEFAULT `'draft'` (`'draft' | 'generating' | 'completed' | 'failed'`)
   - `errorMessage`: `text` (menyimpan pesan error jika generasi gagal)
   - `createdAt`, `updatedAt`: `timestamp`

2. **Tabel `style_presets`**:
   - `id`: primary key (`serial`)
   - `name`: `varchar(120)` NOT NULL
   - `targetAudience`: `varchar(255)` NOT NULL
   - `languageStyle`: `varchar(100)` NOT NULL
   - `language`: `varchar(10)` DEFAULT `'id'`
   - `pov`: `varchar(50)` DEFAULT `'anda'`
   - `customInstructions`: `text`
   - `createdAt`, `updatedAt`: `timestamp`

3. **Tabel `daily_usage`** (untuk pelacakan kuota Mode Gratis per IP agar tetap persisten meski server restart):
   - `id`: primary key (`serial`)
   - `clientIp`: `varchar(64)` NOT NULL
   - `usageDate`: `varchar(10)` NOT NULL (format `YYYY-MM-DD`)
   - `articleCount`: `int` DEFAULT `0` NOT NULL (jumlah generate artikel penuh)
   - `outlineCount`: `int` DEFAULT `0` NOT NULL (jumlah request outline/expand terpisah agar tidak di-spam)
   - `updatedAt`: `timestamp`
   - Tambahkan unique constraint pada kombinasi `(clientIp, usageDate)`.

4. **Data Awal (`src/db/seed.ts`)**:
   - Sediakan script seed idempoten (tidak menduplikasi jika dijalankan ulang) berisi 4 preset bawaan:
     1. *Blog Edukasi Pemula* (Pembaca awam, informatif, sapaan "Anda", hindari jargon rumit)
     2. *Artikel Bisnis & UMKM* (Pemilik usaha kecil-menengah, conversational & praktis, sertakan contoh aplikatif)
     3. *Profesional & B2B* (Manajer/pengambil keputusan, profesional & otoritatif, berbasis kerangka kerja)
     4. *Konten Santai Gen-Z* (Mahasiswa/usia muda, santai & mengalir, sapaan "Kamu", tidak kaku)

---

### 3.2. Alur Generasi Interaktif & Jaminan >= 1.000 Kata
**Catatan Penting untuk Implementer**: Meminta LLM membuat artikel 1.000 kata dalam satu prompt tunggal sering kali gagal (hanya menghasilkan 450–700 kata) dan struktur isinya kadang melenceng dari ekspektasi user. Oleh karena itu, gunakan **alur 2 tahap yang bisa diintervensi user + guardrail jumlah kata**:

1. **Tahap 1 — SEO Brief & Outline Interaktif (`POST /api/articles/outline`)**:
   - LLM menghasilkan JSON terstruktur: `title` (50–60 karakter), `slug`, `metaDescription` (140–160 karakter), `secondaryKeywords` (3–6 frasa LSI), dan `outline` berisi 5–7 bagian H2 (masing-masing punya 2–3 sub-poin H3 + alokasi target kata per bagian sehingga total anggaran kata `>= targetWordCount + 200`, ditambah bagian FAQ 3–5 pertanyaan & Kesimpulan).
   - Di dashboard, user dapat **mengedit judul, mengubah urutan, menambah, atau menghapus H2/H3** sebelum lanjut ke penulisan penuh (menghemat token baik di Mode Gratis maupun BYOK).
   - *Shortcut*: Jika user langsung memanggil `POST /api/articles/generate` tanpa mengirim `customOutline`, backend otomatis menjalankan Tahap 1 lalu langsung lanjut ke Tahap 2.
2. **Tahap 2 — Penulisan Artikel Utuh (`POST /api/articles/generate`)**:
   - LLM menulis artikel lengkap dalam Markdown mengikuti outline yang disetujui user (atau hasil Tahap 1), menyisipkan primary & secondary keywords secara natural, serta mematuhi **Target Audience**, **Tatanan Bahasa**, dan **POV**.
   - Instruksikan LLM untuk menghindari frasa klise AI (misal: *"Di era digital saat ini..."*, *"Bukan rahasia lagi..."*, *"Kesimpulannya, dapat disimpulkan bahwa..."*) agar hasilnya natural seperti tulisan manusia.
3. **Tahap 3 — Verifikasi Jumlah Kata & Auto-Expand Guardrail**:
   - Hitung `wordCount` di server setelah membersihkan sintaks Markdown (`#`, `*`, link URL, dll.).
   - Jika `wordCount < 1000` (atau kurang dari 90% `targetWordCount`), lakukan maksimal **2 kali iterasi ekspansi otomatis** (*expansion pass*): kirim artikel saat ini kembali ke LLM dengan instruksi memperdalam bagian yang masih dangkal (menambah contoh konkret, langkah praktis, tabel perbandingan, atau FAQ) tanpa mengulang paragraf yang sudah ada.
   - Setelah lulus (atau batas retry tercapai), jalankan **SEO Analyzer** dan simpan semua hasil ke MySQL.

---

### 3.3. Arsitektur Mode Hybrid LLM (Gratis Server + BYOK Dashboard) & Rate Limiter

#### A. Standar Klien LLM (OpenAI-Compatible)
Backend berkomunikasi menggunakan standar **OpenAI-compatible HTTP API** (`fetch` ke `${baseUrl}/chat/completions`) agar mendukung berbagai provider gratis maupun berbayar dalam satu klien kode:
- **Google Gemini (OpenAI-compat — Free Tier)**: `https://generativelanguage.googleapis.com/v1beta/openai` (contoh model: `gemini-2.5-flash`)
- **Groq (Free Tier)**: `https://api.groq.com/openai/v1` (contoh model: `llama-3.3-70b-versatile`)
- **OpenRouter (Tersedia model `:free` & premium)**: `https://openrouter.ai/api/v1` (contoh model: `meta-llama/llama-3.3-70b-instruct:free`, `openai/gpt-4o-mini`, `anthropic/claude-3.5-sonnet`)
- **OpenAI**: `https://api.openai.com/v1` (contoh model: `gpt-4o-mini`, `gpt-4o`)
- **Custom / Ollama Lokal**: User mengisi Base URL & nama model sendiri (contoh `http://localhost:11434/v1`).

#### B. Urutan Resolusi Mode per Request (Hybrid)
Setiap request AI (`/api/articles/outline`, `/api/articles/generate`, `/api/articles/:id/expand`) menentukan sumber kredensial LLM dengan prioritas berikut:

1. **Prioritas 1 — Mode BYOK (API Key Milik User dari Dashboard)**:
   - Aktif jika frontend mengirim header `X-LLM-API-Key` (atau `X-LLM-Mode: byok` untuk Ollama lokal tanpa key) bersama `X-LLM-Base-URL` dan `X-LLM-Model`.
   - **Bebas dari batas kuota harian aplikasi** (tidak menambah hitungan `daily_usage`).
   - API Key disimpan lokal di **`localStorage` browser user** (bukan di MySQL). Backend bertindak sebagai proxy (mencegah error CORS) dan **DILARANG mencatat (log) `X-LLM-API-Key`** ke console, response error, atau database.
2. **Prioritas 2 — Mode Gratis Bawaan Server (Free-Tier + Rate Limit)**:
   - Aktif otomatis jika user **tidak** mengirim header BYOK dan pemilik server telah mengisi `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` di `.env` (disarankan menggunakan provider *free-tier* seperti Google Gemini, Groq, atau OpenRouter `:free`).
   - Backend memeriksa kuota harian IP user pada tabel `daily_usage` via `src/services/rate-limit.service.ts`:
     - Batas generate artikel penuh: `FREE_DAILY_LIMIT` (default `3` artikel/hari per IP).
     - Batas outline/expand terpisah: `FREE_DAILY_LIMIT * 3` (default `9` request/hari per IP) agar endpoint outline tidak di-spam.
     - Kuota hanya di-increment saat request berhasil diproses (atau saat mulai diproses untuk mencegah spam paralel; dokumentasikan pilihannya dengan jelas).
   - Jika kuota harian habis: kembalikan **HTTP `429 Too Many Requests`** dengan pesan ramah (info reset esok hari + ajakan memasukkan API Key sendiri di **Pengaturan API** untuk lanjut tanpa batas).
   - **Keamanan**: `LLM_API_KEY` server **tidak boleh pernah** dikirim ke browser/frontend.
3. **Jika Keduanya Tidak Tersedia (`.env` kosong & User belum BYOK)**:
   - Kembalikan **HTTP `400`** dengan pesan jelas agar user memasukkan API Key di Pengaturan API dashboard (atau admin mengisi `.env`).

#### C. Peran Mode Mock (`LLM_MOCK=true`) — HANYA untuk Automated Testing
- **Penting**: Mode Mock (`LLM_MOCK=true`) **BUKAN** fitur untuk user produksi. Pada mode normal (`LLM_MOCK=false`), sistem menjalankan Mode Hybrid di atas (Mode Gratis via `.env` server atau BYOK dari dashboard).
- Mode Mock **hanya digunakan secara internal untuk `bun test` / CI** agar developer dapat menjalankan test otomatis tanpa API key berbayar/jaringan internet (mengembalikan outline & artikel dummy > 1.050 kata).

#### D. Variabel Environment (`.env.example`)
```env
PORT=3000
DATABASE_URL=mysql://root:password@127.0.0.1:3306/artikel_seo

# Konfigurasi Mode Gratis Bawaan Server (Opsional — disarankan Free-Tier: Gemini / Groq / OpenRouter :free)
LLM_API_KEY=
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
LLM_MODEL=gemini-2.5-flash
FREE_DAILY_LIMIT=3

# Khusus automated test (bun test). Biarkan false untuk penggunaan normal.
LLM_MOCK=false
```

---

### 3.4. Spesifikasi SEO Analyzer (Deterministik di Backend)
Buat fungsi murni (*pure function*) di `src/services/seo-analyzer.service.ts` yang menerima `{ keyword, secondaryKeywords, title, slug, metaDescription, content }` dan mengembalikan objek laporan berisi:
- `wordCount`: jumlah kata teks bersih (strip sintaks Markdown).
- `readingTimeMinutes`: `Math.ceil(wordCount / 200)`.
- `keywordCount` & `keywordDensity`: persentase kemunculan primary keyword (ideal `0.5% – 2.5%`).
- `headings`: `{ h1: number, h2: number, h3: number }`.
- `checks`: array item pemeriksaan dengan status `pass | warn | fail` dan pesan singkat dalam Bahasa Indonesia:
  1. Panjang artikel minimal 1.000 kata (`wordCount >= 1000`).
  2. Primary keyword ada di SEO Title.
  3. Primary keyword ada di Meta Description.
  4. Primary keyword ada di URL Slug.
  5. Primary keyword muncul di 100 kata pertama (paragraf pembuka).
  6. Primary keyword muncul di minimal satu H2.
  7. Kepadatan keyword dalam rentang wajar (`0.5% – 2.5%`).
  8. Panjang SEO Title ideal (`45–65` karakter).
  9. Panjang Meta Description ideal (`120–165` karakter).
  10. Struktur heading baik (`h1 === 1` dan `h2 >= 4`).
- `score`: nilai `0–100` dari bobot checks di atas.

---

### 3.5. Kontrak REST API (ElysiaJS)
Semua endpoint API berada di bawah prefix `/api` dengan validasi body menggunakan skema bawaan Elysia (`t.Object(...)`):

| Method | Endpoint | Fungsi |
|---|---|---|
| `GET` | `/health` | Health check server (eksisting) |
| `GET` | `/api/llm/status` | Cek ketersediaan Mode Gratis server, model default (tanpa API key), serta sisa kuota harian user (`freeModeAvailable`, `dailyLimit`, `usedToday`, `remainingToday`) |
| `POST` | `/api/llm/test` | Tes validitas konfigurasi BYOK (`X-LLM-API-Key`, `X-LLM-Base-URL`, `X-LLM-Model`) dengan ping ringan ke LLM |
| `POST` | `/api/articles/outline` | Tahap 1: Generate SEO Brief + Outline H2/H3 (pakai BYOK jika ada header, atau Mode Gratis server dengan rate limit) |
| `POST` | `/api/articles/generate` | Tahap 2+3: Generate artikel SEO >= 1.000 kata (menerima parameter input + opsional `customOutline`; pakai BYOK atau Mode Gratis server dengan rate limit, kembalikan `429` jika kuota habis) |
| `POST` | `/api/articles/:id/expand` | Perpanjang/perdalam konten artikel eksisting dan hitung ulang SEO report |
| `GET` | `/api/articles` | Daftar artikel (query opsional: `?search=...&status=...`), diurutkan terbaru |
| `GET` | `/api/articles/:id` | Detail lengkap 1 artikel + `seoReport` |
| `PATCH` | `/api/articles/:id` | Simpan hasil edit manual (`title`, `slug`, `metaDescription`, `content`), otomatis hitung ulang `wordCount` & `seoScore` |
| `DELETE` | `/api/articles/:id` | Hapus artikel |
| `GET` | `/api/articles/:id/export` | Export artikel (`?format=md` atau `?format=html`) dengan header `Content-Disposition` |
| `GET` | `/api/presets` | Daftar seluruh preset audiens & gaya bahasa |
| `POST` | `/api/presets` | Tambah preset baru |
| `DELETE` | `/api/presets/:id` | Hapus preset |

---

## 4. Panduan Desain Dashboard: Anti-AI-Slop (WAJIB DIPATUHI)

Dashboard disajikan langsung pada route `/` dari folder `public/` (`public/index.html`, `public/styles.css`, `public/app.js`). Jangan membuat tampilan generik seperti template SaaS AI biasa. Ikuti panduan **Editorial Publishing Desk** berikut secara ketat:

### 4.1. Prinsip Visual & Palet Warna (Light Mode — Warm Paper & Ink)
Gunakan CSS custom properties dengan palet cetak editorial yang tenang dan kontras tajam:
- **Canvas Utama**: `#F7F5F0` (kertas hangat / warm alabaster)
- **Panel Editor / Form**: `#FFFFFF` (putih bersih)
- **Sidebar / Surface Sekunder**: `#EFECE4`
- **Teks Utama**: `#18181B` (charcoal pekat)
- **Teks Sekunder / Label**: `#57534E` (warm slate)
- **Garis Pemisah (Border)**: `1px solid #DDD8CC` (garis tipis tegas sebagai pemisah utama, bukan bayangan besar)
- **Satu Warna Aksen Utama**: Deep Forest Green `#1B4D3E` (hover `#143A2F`) untuk tombol aksi primer dan indikator aktif
- **Warna Status Semantik (Muted)**:
  - Pass / Valid: `#1B4D3E` (bg `#E6F0EC`)
  - Warning: `#9A5B13` (bg `#FBF3E4`)
  - Error / Fail: `#991B1B` (bg `#FDECEC`)

### 4.2. Tipografi
- **Judul & Konten Preview Artikel**: Serif editorial (`Newsreader` atau `Georgia, serif`) untuk nuansa publikasi/blog profesional.
- **UI, Form, Tombol**: Sans-serif bersih (`IBM Plex Sans` atau `system-ui, sans-serif`).
- **Angka, Word Count, SEO Score, Slug, Mode Edit Markdown**: Monospace (`IBM Plex Mono` atau `ui-monospace, monospace`) dengan `font-variant-numeric: tabular-nums`.

### 4.3. Struktur Layout (3-Pane Editorial Workspace)
1. **Sidebar Kiri (`250px`, responsif jadi drawer di layar kecil)**:
   - Nama workspace sederhana di bagian atas (tanpa logo mengilap/animasi).
   - Tombol primer `+ Artikel Baru`.
   - Input pencarian ringkas & filter status (`Semua`, `Selesai`, `Draft`).
   - Daftar artikel tersimpan (Judul, keyword, jumlah kata dalam monospace, badge skor SEO kecil).
   - Navigasi bawah: `Preset Bahasa` dan `Pengaturan API` disertai badge status ringkas yang jujur:
     - Jika BYOK aktif -> `API Sendiri (Tanpa Batas)`
     - Jika Mode Gratis server aktif -> `Mode Gratis · Sisa X/3`
     - Jika keduanya belum tersedia -> `API Belum Diatur`
2. **Area Utama (Fluid, Tengah)**:
   - **Tampilan Buat Artikel Baru (Langsung Siap Pakai ala RyRob)**:
     - Baris informasi ringkas di atas form:
       - Jika Mode Gratis aktif: tampilkan sisa kuota hari ini (`Mode Gratis: sisa 3/3 artikel hari ini`) dengan link kecil `Gunakan API sendiri untuk tanpa batas`.
       - Jika kuota gratis habis (`0/3`) atau server belum punya key: tampilkan banner tenang dengan tombol menuju `Pengaturan API (BYOK)`.
     - **Langkah 1 — Topik, Pembaca & Gaya**: Kata kunci utama, kata kunci pendukung (LSI), target jumlah kata (default `1200`, minimum `1000`), Pemilih Preset (1 klik), Target Audience, Tatanan Bahasa/Tone, Sudut Pandang (POV), Bahasa (ID/EN), Instruksi Tambahan.
     - Dua aksi jelas: tombol utama `Buat Outline Dulu` dan tombol sekunder `Langsung Tulis Artikel`.
     - **Langkah 2 — Review & Edit Outline**: Setelah outline jadi, tampilkan SEO Title, Slug, Meta Description, dan daftar bagian H2/H3 yang bisa diedit teksnya, ditambah, dihapus, atau digeser urutannya -> lalu tombol `Tulis Artikel Lengkap (>= 1.000 Kata)`.
     - Indikator progres teks yang jujur saat memproses (*Menyusun outline -> Menulis artikel -> Memeriksa target kata & SEO*).
   - **Tampilan Pengaturan API (BYOK & Mode Gratis)**:
     - Pilihan mode jelas: **Gunakan Mode Gratis Bawaan Server** (default, terbatas per hari) atau **Gunakan API Key Sendiri (Tanpa Batas)**.
     - Form BYOK: Provider Preset (*Google Gemini, Groq, OpenRouter, OpenAI, Custom/Ollama*), Base URL, API Key (masked), dan Nama Model + tombol `Test Koneksi` & `Simpan Pengaturan` (disimpan di `localStorage` browser).
     - Sertakan catatan transparan bahwa API Key tersimpan lokal di browser user + tautan referensi singkat tempat membuat API Key gratis sendiri (Google AI Studio, Groq Console, OpenRouter).
   - **Tampilan Detail & Editor Artikel**:
     - Header metadata ringkas (editable: SEO Title, URL Slug, Meta Description + penghitung karakter langsung).
     - Toolbar sederhana: Toggle `Preview` / `Markdown`, tombol `Simpan` (muncul saat ada perubahan), `Perpanjang`, `Copy MD`, `Copy HTML`, `Download`, `Hapus`.
     - Area baca/tulis dengan lebar kolom nyaman (`max-width: 68ch`, `line-height: 1.75`, padding lega).
3. **Panel Inspektor SEO Kanan (`290px`, di bawah konten pada layar sempit)**:
   - Skor SEO besar dalam angka monospace (`86/100`) + status jumlah kata (`1.245 / 1.000 kata`).
   - Ringkasan metrik ringkas: Waktu Baca, Keyword Density, Jumlah H1/H2/H3.
   - Daftar checklist SEO (simbol teks sederhana `✓`, `!`, `×` — rapi dan mudah dipindai).

### 4.4. Daftar Larangan Tegas (Anti-AI-Slop Rules)
Implementer **TIDAK BOLEH** melakukan hal-hal berikut:
- ❌ **Dilarang** memakai palet warna ungu/indigo/violet/neon atau background dark-mode generik dengan gradasi warna-warni.
- ❌ **Dilarang** memakai *glassmorphism* (`backdrop-filter: blur`), efek cahaya (*glow*), atau `box-shadow` tebal.
- ❌ **Dilarang** menaruh emoji dekoratif pada judul, label, atau tombol (contoh terlarang: `✨ Generate with AI`, `🚀 Boost SEO`, `🔥 Viral`). Gunakan teks bahasa Indonesia yang lugas dan ikon SVG garis tipis (`16px`) secukupnya.
- ❌ **Dilarang** menambahkan hero section marketing, tagline promosi, atau 4 kartu statistik palsu di atas dashboard. Buka aplikasi langsung masuk ke ruang kerja.
- ❌ **Dilarang** memakai sudut terlalu membulat (`border-radius` maksimal `4px–6px`).
- ❌ **Dilarang** membiarkan teks artikel melebar penuh memenuhi monitor (`100% width`); wajib batasi lebar bacaan di `65ch–72ch`.
- ❌ **Keamanan UI**: Konten Markdown yang dirender ke HTML di browser wajib disanitasi (cegah XSS/injeksi `<script>`).

---

## 5. Struktur Direktori Target

```text
├── drizzle/
├── public/
│   ├── index.html          # Shell dashboard editorial
│   ├── styles.css          # Design system anti-AI-slop (Warm Paper & Ink)
│   └── app.js              # Logic UI, Mode Gratis/BYOK settings, outline editor, markdown preview & export
├── src/
│   ├── db/
│   │   ├── index.ts        # Koneksi pool MySQL & instance Drizzle
│   │   ├── schema.ts       # Tabel articles, style_presets, dan daily_usage
│   │   └── seed.ts         # Seed 4 preset bawaan
│   ├── services/
│   │   ├── llm.service.ts              # Client LLM OpenAI-compatible (Hybrid BYOK + Free Server + mode test LLM_MOCK)
│   │   ├── rate-limit.service.ts       # Cek & catat kuota harian Mode Gratis per IP (tabel daily_usage)
│   │   ├── seo-analyzer.service.ts     # Kalkulasi word count, density, heading, SEO score
│   │   └── article-generator.service.ts # Pipeline Outline -> Full Draft -> Guardrail >= 1000 kata
│   ├── routes/
│   │   ├── health.ts       # GET /health
│   │   ├── llm.ts          # GET /api/llm/status & POST /api/llm/test
│   │   ├── articles.ts     # Endpoint /api/articles/* (outline, generate, expand, CRUD, export)
│   │   └── presets.ts      # Endpoint /api/presets/*
│   └── index.ts            # Register API routes + serve static files dari public/
├── test/
│   ├── index.test.ts       # Test dashboard HTML & health check
│   ├── seo-analyzer.test.ts # Unit test metrik & skor SEO
│   └── articles.test.ts    # Test Mode Gratis + rate limit (429), BYOK bypass, outline, generator (>= 1000 kata) & API
├── .env.example
└── package.json
```

---

## 6. Tahapan Pengerjaan (Step-by-Step Milestones)

Kerjakan secara berurutan. Pastikan `bun check` dan `bun test` lulus di setiap akhir tahap sebelum lanjut ke tahap berikutnya:

### Tahap 1 — Database Schema & Seed Preset
- Perbarui `src/db/schema.ts` untuk tabel `articles` (pakai `longtext` untuk `content` & `outline`), `style_presets`, dan `daily_usage`.
- Jalankan `bun run db:generate` untuk menghasilkan migrasi SQL terbaru.
- Buat `src/db/seed.ts` dan tambahkan script `"db:seed": "bun src/db/seed.ts"` di `package.json`.

### Tahap 2 — SEO Analyzer Service & Unit Test
- Implementasikan `src/services/seo-analyzer.service.ts` sebagai fungsi murni.
- Buat unit test `test/seo-analyzer.test.ts` yang menguji: perhitungan kata bersih (mengabaikan sintaks Markdown), deteksi `< 1000` vs `>= 1000` kata, keyword density, cek heading, dan skor SEO.

### Tahap 3 — Hybrid LLM Service, Rate Limiter & 2-Stage Article Generator
- Implementasikan `src/services/rate-limit.service.ts` untuk memeriksa dan menambah hitungan pemakaian harian (`daily_usage`) berdasarkan IP client pada Mode Gratis.
- Implementasikan `src/services/llm.service.ts` yang mendukung resolusi **Hybrid** (Prioritas 1: BYOK per-request; Prioritas 2: Free-Tier server `.env`; fallback error jelas jika keduanya kosong) serta mode `LLM_MOCK=true` khusus untuk automated testing.
- Pastikan API Key (baik BYOK maupun `.env` server) **tidak pernah** dicetak ke log atau bocor ke response/frontend.
- Perbarui `.env.example` sesuai Bagian 3.3.D.
- Implementasikan `src/services/article-generator.service.ts` dengan dua fungsi utama: `generateOutline(...)` dan `generateArticle(...)` (menerima opsional `customOutline` + menjalankan Auto-Expand Guardrail jika `< 1000` kata).
- Pastikan `targetAudience`, `languageStyle`, `pov`, `language`, dan `customInstructions` diteruskan dengan jelas ke prompt sistem & user.

### Tahap 4 — REST API Routes (ElysiaJS) & Integration Test
- Implementasikan `src/routes/llm.ts` (`GET /api/llm/status`, `POST /api/llm/test`), `src/routes/articles.ts` (`outline`, `generate`, `expand`, CRUD, export), dan `src/routes/presets.ts`.
- Terapkan pengecekan kuota harian hanya ketika request menggunakan **Mode Gratis server** (kembalikan `429` jika melebihi `FREE_DAILY_LIMIT`), dan lewati rate limit saat user menggunakan **Mode BYOK** (`X-LLM-API-Key`).
- Daftarkan route API (`/api/*`) dan static file serving (`public/`) di `src/index.ts` sehingga `GET /` menyajikan dashboard HTML (`public/index.html`). Pisahkan pembuatan instance `app` dari `.listen(port)` (misal guard dengan `if (import.meta.main)`) agar import `app` pada test tidak bentrok port.
- Perbarui `test/index.test.ts` menyesuaikan `GET /` yang kini mengembalikan HTML dashboard, serta buat `test/articles.test.ts` untuk memverifikasi:
  - Status `GET /api/llm/status` dan pemotongan kuota Mode Gratis.
  - Penolakan `HTTP 429` saat kuota Mode Gratis habis, dan bypass rate limit saat memakai BYOK.
  - Penolakan `HTTP 400` jika tidak ada BYOK maupun server key (saat `LLM_MOCK=false`).
  - Pembuatan outline, generate artikel (`wordCount >= 1000`), edit manual (recalculate SEO score), dan export `.md`/`.html`.

### Tahap 5 — Dashboard Web Anti-AI-Slop
- Bangun `public/index.html`, `public/styles.css`, dan `public/app.js` mengikuti seluruh spesifikasi di **Bagian 4**.
- Pastikan semua alur utama berjalan mulus di browser desktop maupun mobile:
  1. **Alur Gratis Langsung Pakai**: User baru buka dashboard -> lihat sisa kuota Mode Gratis -> langsung isi Keyword, Target Audience & Tatanan Bahasa -> klik `Buat Outline Dulu` -> edit/tambah/hapus poin outline -> klik `Tulis Artikel Lengkap` (atau tombol cepat `Langsung Tulis Artikel`).
  2. **Alur BYOK**: Buka `Pengaturan API` -> pilih mode API Sendiri, pilih provider, masukkan API Key & Model -> klik `Test Koneksi` -> simpan ke `localStorage` -> status berubah menjadi `API Sendiri (Tanpa Batas)` (dan tersedia opsi kembali ke Mode Gratis).
  3. Periksa panel Inspektor SEO (word count `>= 1000`, checklist, skor).
  4. Edit artikel/metadata -> simpan -> skor SEO & word count ter-update otomatis.
  5. Export / Copy Markdown & HTML.
  6. Kelola preset (buat & hapus preset custom).

---

## 7. Kriteria Selesai (Acceptance Criteria)
- [ ] User yang **tidak memiliki API Key** dapat langsung men-generate outline dan artikel SEO gratis di dashboard memakai API *free-tier* server (`.env`), dengan pelacakan & batasan kuota harian (`FREE_DAILY_LIMIT`) yang mengembalikan `HTTP 429` saat kuota habis.
- [ ] User yang **memiliki API Key sendiri** dapat memasukkannya lewat **Pengaturan API (BYOK)** di dashboard, menjalankan **Test Koneksi**, dan men-generate artikel tanpa batas kuota harian aplikasi (API Key disimpan di `localStorage`, tidak masuk MySQL atau log server).
- [ ] `LLM_API_KEY` milik server tidak pernah bocor ke frontend, response API, maupun log.
- [ ] User dapat menjalankan alur interaktif ala *RyRob* (**Keyword + Audience/Tone -> Generate & Edit Outline -> Generate Artikel >= 1.000 Kata**) maupun mode 1-klik langsung generate.
- [ ] Artikel yang dihasilkan memiliki struktur SEO lengkap (Title, Slug, Meta Description, H1, minimal 4 H2, sub-heading H3/FAQ) dan panjang **minimal 1.000 kata** (diverifikasi oleh guardrail server-side).
- [ ] Perubahan parameter **Target Audience** dan **Tatanan Bahasa** (serta preset) memengaruhi prompt dan tersimpan bersama data artikel di MySQL.
- [ ] Panel SEO Analyzer menampilkan jumlah kata, waktu baca, keyword density, struktur heading, skor `0–100`, dan checklist secara akurat serta ter-update otomatis saat artikel diedit.
- [ ] Fitur simpan edit manual, perpanjang artikel (expand), hapus artikel, serta Copy/Download `.md` dan `.html` berfungsi normal.
- [ ] Tampilan dashboard bersih bergaya *Editorial Publishing Desk* dan lulus seluruh **Daftar Larangan Anti-AI-Slop** pada Bagian 4.4.
- [ ] `bun check` lulus tanpa error TypeScript.
- [ ] `bun test` lulus seluruh test (termasuk test Mode Gratis + rate limit `429`, BYOK bypass, generator >= 1.000 kata, dan SEO analyzer).
- [ ] `.env.example` dan `README.md` diperbarui dengan instruksi konfigurasi Mode Gratis server, BYOK, dan cara menjalankan aplikasi.
