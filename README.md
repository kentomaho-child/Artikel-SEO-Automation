# Artikel SEO Desk (Automation & Publishing Dashboard)

Platform pembuatan artikel SEO panjang (minimal 1.000 kata) berbasis **Bun**, **ElysiaJS**, **Drizzle ORM**, dan **MySQL** dengan antarmuka web bertema *Editorial Publishing Desk* (Anti-AI-Slop) yang terinspirasi alur kerja *co-pilot* gratis ala RyRob AI Article Writer.

## Fitur Utama

- **Artikel SEO >= 1.000 Kata dengan Auto-Expand**: Menghasilkan artikel terstruktur (H1, minimal 4 H2, sub-heading H3, FAQ, dan Kesimpulan) dengan guardrail otomatis di backend untuk menjamin panjang artikel minimal 1.000 kata teks bersih.
- **Mode Hybrid (Gratis Server + BYOK Dashboard)**:
  - **Mode Gratis**: Pengunjung langsung bisa membuat artikel gratis menggunakan API *free-tier* server (misal Google Gemini Free Tier, Groq, OpenRouter `:free`) dengan batas kuota harian (`FREE_DAILY_LIMIT=3` artikel/hari per IP).
  - **Mode BYOK (Bring Your Own Key)**: Pengguna dapat memasukkan API Key dan memilih model sendiri di dashboard untuk penggunaan tanpa batas kuota aplikasi (disimpan di `localStorage` browser, tidak masuk ke database).
- **Alur Interaktif 2-Tahap**:
  - *Tahap 1*: Generate SEO Brief & Outline (Judul SEO, URL Slug, Meta Description, dan daftar bagian H2/H3).
  - *Tahap 2*: Pengguna dapat meninjau, mengedit, menambah, atau menghapus bagian outline sebelum AI menulis artikel lengkap (atau opsi tombol cepat "Langsung Tulis Artikel").
- **Preset Profil Pembaca & Tatanan Bahasa**: 4 preset bawaan (*Blog Edukasi Pemula*, *Artikel Bisnis & UMKM*, *Profesional & B2B*, *Konten Santai Gen-Z*) plus kemampuan menambah preset custom.
- **Inspektor & SEO Analyzer Real-Time**: Evaluasi otomatis 10 parameter SEO (word count, keyword in title/meta/slug/intro/H2, keyword density, panjang karakter, struktur heading) dengan skor 0–100.
- **Editor & Ekspor Fleksibel**: Preview Markdown instan yang aman (disanitasi), editor Markdown live, tombol Perpanjang (Expand), Salin Markdown/HTML, dan Download `.md` atau `.html`.
- **Desain Anti-AI-Slop**: Estetika *Warm Paper & Ink* (`#F7F5F0`, `#FFFFFF`, charcoal `#18181B`, aksen deep green `#1B4D3E`) tanpa gradasi ungu/neon, tanpa glassmorphism, dan tanpa tombol emoji mengilap.

---

## Tech Stack

- **Runtime & Package Manager**: [Bun](https://bun.sh)
- **Web Framework**: [ElysiaJS](https://elysiajs.com)
- **Database & ORM**: MySQL + [Drizzle ORM](https://orm.drizzle.team)
- **Markdown Processing**: [marked](https://github.com/markedjs/marked)
- **Testing**: `bun:test`
- **Language**: TypeScript

---

## Struktur Direktori

```text
├── drizzle/                    # File migrasi SQL hasil generate Drizzle
├── public/                     # Frontend dashboard editorial (Anti-AI-Slop)
│   ├── index.html              # Shell HTML workspace 3 panel
│   ├── styles.css              # Design system Warm Paper & Ink
│   └── app.js                  # State UI, BYOK local storage, parser & API client
├── src/
│   ├── db/
│   │   ├── index.ts            # Pool koneksi MySQL & instance Drizzle
│   │   ├── schema.ts           # Schema: articles, style_presets, daily_usage
│   │   └── seed.ts             # Seeder 4 preset bahasa bawaan
│   ├── services/
│   │   ├── llm.service.ts      # Client OpenAI-compatible (Hybrid BYOK + Server + Mock)
│   │   ├── rate-limit.service.ts # Tracker kuota harian IP untuk Mode Gratis
│   │   ├── seo-analyzer.service.ts # Kalkulasi kata bersih, kepadatan kata kunci, dan skor SEO
│   │   └── article-generator.service.ts # Pipeline 2 tahap & Auto-Expand Guardrail >= 1000 kata
│   ├── routes/
│   │   ├── health.ts           # GET /health
│   │   ├── llm.ts              # GET /api/llm/status, POST /api/llm/test
│   │   ├── presets.ts          # CRUD /api/presets
│   │   └── articles.ts         # Outline, generate, expand, CRUD, export /api/articles/*
│   └── index.ts                # Server entrypoint & static file serving
├── test/
│   ├── index.test.ts           # Test core server & static HTML
│   ├── seo-analyzer.test.ts     # Unit test analyzer SEO
│   └── articles.test.ts        # Integration test alur generator & API
├── .env.example
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

---

## Cara Menjalankan

### 1. Instalasi Dependency
```bash
bun install
```

### 2. Konfigurasi Environment
Salin template environment variable:
```bash
cp .env.example .env
```
Sesuaikan isi `.env` (misal `DATABASE_URL` untuk MySQL dan opsi `LLM_API_KEY` untuk Mode Gratis server).

### 3. Database Migration & Seed
Generate dan push migrasi ke MySQL:
```bash
bun run db:generate
bun run db:push
```

Seed preset audiens dan gaya bahasa bawaan:
```bash
bun run db:seed
```

### 4. Menjalankan Server
Mode pengembangan (dengan live reload):
```bash
bun run dev
```

Buka browser di **`http://localhost:3000`**.

### 5. Menjalankan Test
Semua pengujian berjalan secara otomatis dan mandiri (menggunakan mock LLM internal tanpa biaya token):
```bash
bun test
```
Verifikasi type safety:
```bash
bun check
```
