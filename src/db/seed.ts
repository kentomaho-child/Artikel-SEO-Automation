import { eq } from "drizzle-orm";
import { db, pool } from "./index";
import { stylePresets } from "./schema";

export const defaultPresets = [
  {
    name: "Blog Edukasi Pemula",
    targetAudience: "Pembaca awam yang baru mengenal topik",
    languageStyle: "informatif",
    language: "id",
    pov: "anda",
    customInstructions:
      "Gunakan penjelasan analogi sederhana, hindari jargon rumit tanpa definisi, dan buat penjelasan langkah-demi-langkah yang mudah dipahami pemula.",
  },
  {
    name: "Artikel Bisnis & UMKM",
    targetAudience: "Pemilik usaha kecil, pelaku UMKM, dan pegiat bisnis",
    languageStyle: "conversational",
    language: "id",
    pov: "anda",
    customInstructions:
      "Fokus pada efisiensi operasional, return on investment (ROI), contoh kasus nyata di Indonesia, dan langkah tindakan taktis berbiaya terjangkau.",
  },
  {
    name: "Profesional & B2B",
    targetAudience: "Manajer, pengambil keputusan bisnis, dan profesional industri",
    languageStyle: "profesional",
    language: "id",
    pov: "anda",
    customInstructions:
      "Gunakan nada otoritatif, sajikan data dan kerangka kerja analitis, tekankan dampak strategis, skalabilitas, dan kepatuhan.",
  },
  {
    name: "Konten Santai Gen-Z",
    targetAudience: "Mahasiswa, anak muda, dan first-jobber",
    languageStyle: "santai",
    language: "id",
    pov: "kamu",
    customInstructions:
      "Gunakan gaya bahasa mengalir dan luwes dengan sapaan 'kamu', jangan kaku, tetapi tetap informatif dan berbobot tanpa kalimat klise AI.",
  },
];

export async function seedPresets() {
  console.log("Seeding default style presets...");
  for (const preset of defaultPresets) {
    try {
      const existing = await db
        .select()
        .from(stylePresets)
        .where(eq(stylePresets.name, preset.name))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(stylePresets).values(preset);
        console.log(`✓ Inserted preset: ${preset.name}`);
      } else {
        console.log(`- Preset already exists: ${preset.name}`);
      }
    } catch (err) {
      console.warn(`Warning seeding ${preset.name}:`, (err as Error).message);
    }
  }
  console.log("Seeding complete.");
}

if (import.meta.main) {
  await seedPresets();
  await pool.end();
}
