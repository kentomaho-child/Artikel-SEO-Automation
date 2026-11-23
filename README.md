# Artikel SEO Automation

Backend service untuk otomasi artikel SEO berbasis **Bun**, **ElysiaJS**, **Drizzle ORM**, dan **MySQL**.

## Tech Stack
- **Runtime**: [Bun](https://bun.sh)
- **Framework**: [ElysiaJS](https://elysiajs.com)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team)
- **Database Driver**: [MySQL2](https://github.com/sidorares/node-mysql2)
- **Language**: TypeScript

## Struktur Direktori
```text
├── drizzle/              # File migrasi SQL hasil generate Drizzle
├── src/
│   ├── db/
│   │   ├── index.ts      # Setup koneksi pool MySQL & instance Drizzle
│   │   └── schema.ts     # Definisi schema database (MySQL)
│   ├── routes/
│   │   └── health.ts     # Route health check
│   └── index.ts          # Entry point aplikasi Elysia
├── test/
│   └── index.test.ts     # Automated test endpoints
├── .env.example          # Template environment variable
├── drizzle.config.ts     # Konfigurasi Drizzle Kit
├── package.json
└── tsconfig.json
```

## Cara Menjalankan

### 1. Instalasi Dependency
```bash
bun install
```

### 2. Konfigurasi Environment
Salin `.env.example` ke `.env` dan sesuaikan kredensial MySQL:
```bash
cp .env.example .env
```

### 3. Database Migration
Generate file migrasi baru:
```bash
bun run db:generate
```

Push skema langsung ke database:
```bash
bun run db:push
```

Buka Drizzle Studio:
```bash
bun run db:studio
```

### 4. Menjalankan Server
Mode development (hot reload):
```bash
bun run dev
```

Mode production:
```bash
bun run start
```

### 5. Menjalankan Test
```bash
bun test
```
