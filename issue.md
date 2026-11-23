# Setup Project Awal: Bun + ElysiaJS + Drizzle ORM + MySQL

## Tujuan
Menginisialisasi fondasi project backend baru langsung di **root folder** ini menggunakan **Bun**, **ElysiaJS**, **Drizzle ORM**, dan **MySQL** agar siap digunakan untuk pengembangan fitur selanjutnya.

## Tech Stack & Dependency
- **Runtime & Package Manager**: Bun (TypeScript)
- **Web Framework**: ElysiaJS (`elysia`)
- **ORM & Schema Management**: Drizzle ORM (`drizzle-orm`) & Drizzle Kit (`drizzle-kit`)
- **Database**: MySQL (gunakan driver yang kompatibel dengan Drizzle ORM, seperti `mysql2`)

## Rencana Implementasi (High-Level)

1. **Inisialisasi Project di Root Folder**
   - Inisialisasi project baru menggunakan Bun langsung pada direktori saat ini (jangan membuat subfolder project baru).
   - Pastikan konfigurasi TypeScript (`tsconfig.json`) dan `.gitignore` (mengabaikan `node_modules`, `.env`, file build/cache) sudah tersedia.

2. **Instalasi Dependency**
   - Pasang dependency utama: ElysiaJS, Drizzle ORM, dan driver MySQL.
   - Pasang `drizzle-kit` sebagai devDependency untuk manajemen migrasi/schema.

3. **Struktur Direktori Dasar**
   - Buat struktur folder yang sederhana, modular, dan mudah dikembangkan di dalam `src/`, misalnya memisahkan:
     - Entry point aplikasi / server ElysiaJS
     - Konfigurasi koneksi & definisi schema database (Drizzle)
     - Routing / endpoint dasar

4. **Konfigurasi Environment**
   - Gunakan environment variable untuk konfigurasi aplikasi (seperti `PORT` dan `DATABASE_URL` / kredensial MySQL).
   - Sediakan file `.env.example` sebagai referensi tanpa menyertakan kredensial asli.

5. **Setup Drizzle ORM & Koneksi MySQL**
   - Buat file konfigurasi Drizzle (`drizzle.config.ts`) dengan dialect MySQL dan lokasi folder schema/migrasi.
   - Siapkan modul koneksi database menggunakan connection pool MySQL + Drizzle ORM.
   - Tambahkan satu file schema placeholder/minimal agar konfigurasi Drizzle dapat diverifikasi.

6. **Setup Server ElysiaJS**
   - Buat server ElysiaJS dasar yang membaca konfigurasi port dari environment.
   - Sediakan endpoint dasar (misalnya `GET /` atau `GET /health`) untuk memastikan server berjalan dengan baik.

7. **Script Pendukung di `package.json`**
   - Tambahkan script dasar untuk menjalankan server di mode development/production dan menjalankan perintah Drizzle (seperti generate/push/migrate schema).

## Kriteria Selesai (Acceptance Criteria)
- [x] Project berhasil diinisialisasi di root folder menggunakan Bun.
- [x] Dependency `elysia`, `drizzle-orm`, driver MySQL, dan `drizzle-kit` terpasang dengan benar di `package.json`.
- [x] Struktur folder rapi, modular, dan tidak ada error TypeScript.
- [x] File `.env.example` dan `.gitignore` sudah dikonfigurasi dengan benar.
- [x] Server ElysiaJS dapat dijalankan dan endpoint health check merespons dengan normal.
- [x] Konfigurasi Drizzle untuk MySQL valid dan siap digunakan saat koneksi database MySQL tersedia.

## Batasan (Out of Scope)
- Belum perlu mengimplementasikan fitur bisnis / logic *Artikel SEO Automation*.
- Belum perlu menambahkan autentikasi, CRUD kompleks, frontend, ataupun konfigurasi deployment/CI-CD.
