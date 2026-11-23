import {
  callChatCompletion,
  type LlmRequestConfig,
} from "./llm.service";
import {
  analyzeSeo,
  countWords,
  type SeoReport,
  stripMarkdown,
} from "./seo-analyzer.service";

export interface OutlineSection {
  heading: string;
  targetWords: number;
  subheadings?: string[];
}

export interface GeneratedOutline {
  title: string;
  slug: string;
  metaDescription: string;
  secondaryKeywords: string[];
  outline: OutlineSection[];
}

export interface GenerateOutlineInput {
  keyword: string;
  targetAudience: string;
  languageStyle: string;
  language?: string;
  pov?: string;
  targetWordCount?: number;
  secondaryKeywords?: string | string[];
  customInstructions?: string;
}

export interface GenerateArticleInput extends GenerateOutlineInput {
  customOutline?: GeneratedOutline;
}

export interface GeneratedArticleResult {
  title: string;
  slug: string;
  metaDescription: string;
  secondaryKeywords: string;
  outline: string;
  content: string;
  wordCount: number;
  seoScore: number;
  seoReport: SeoReport;
}

function parseSecondaryKeywords(input?: string | string[]): string[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.map((s) => s.trim()).filter(Boolean);
  return input
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function generateOutline(
  params: GenerateOutlineInput,
  config?: LlmRequestConfig
): Promise<GeneratedOutline> {
  const keyword = params.keyword.trim();
  const targetWords = Math.max(1000, Number(params.targetWordCount) || 1200);
  const lang = params.language === "en" ? "English" : "Bahasa Indonesia";
  const pov = params.pov || "anda";
  const audience = params.targetAudience.trim();
  const style = params.languageStyle.trim();
  const secondary = parseSecondaryKeywords(params.secondaryKeywords);

  const systemPrompt = `Anda adalah Ahli Strategi Konten SEO dan Editor Publikasi Profesional.
Tugas Anda adalah merancang SEO Content Brief dan Outline terstruktur untuk artikel panjang dengan kualitas editorial tinggi.
Bahasa output: ${lang}.
Gaya bahasa: ${style}.
Target pembaca: ${audience}.
Sudut pandang / sapaan: Gunakan '${pov}'.
Target panjang artikel akhir: minimal ${targetWords} kata.

WAJIB menghasilkan output dalam format JSON murni dengan skema berikut:
{
  "title": "SEO Title (45-65 karakter, wajib memuat kata kunci utama)",
  "slug": "url-slug-ramah-seo",
  "metaDescription": "Meta description persuasif (120-165 karakter, wajib memuat kata kunci utama)",
  "secondaryKeywords": ["3 sampai 6 kata kunci turunan/LSI yang relevan"],
  "outline": [
    {
      "heading": "Judul Bagian H2 (Sertakan kata kunci pada minimal satu H2)",
      "targetWords": 250,
      "subheadings": ["Poin H3 A", "Poin H3 B"]
    }
  ]
}

Aturan Outline:
1. Sediakan 5 sampai 7 bagian H2 (termasuk bagian FAQ berisi 3-4 pertanyaan umum dan Kesimpulan/Langkah Aksi).
2. Setiap bagian H2 harus memiliki 2-3 sub-poin H3.
3. Alokasikan targetWords di setiap bagian H2 sehingga total target kata keseluruhan adalah minimal ${
    targetWords + 200
  } kata.`;

  const userPrompt = `Rancang outline SEO untuk:
Kata Kunci Utama: "${keyword}"
Kata Kunci Pendukung (opsional): ${secondary.length > 0 ? secondary.join(", ") : "Otomatis tentukan yang relevan"}
Target Pembaca: ${audience}
Tatanan Bahasa / Tone: ${style}
${params.customInstructions ? `Instruksi Tambahan: ${params.customInstructions}` : ""}`;

  const rawJson = await callChatCompletion(
    {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.6,
      jsonMode: true,
    },
    config
  );

  try {
    const parsed = JSON.parse(rawJson) as GeneratedOutline;
    return {
      title: parsed.title || `${keyword}: Panduan Lengkap dan Praktis`,
      slug: (parsed.slug || keyword.toLowerCase().replace(/\s+/g, "-")).replace(
        /[^a-z0-9-]/gi,
        ""
      ),
      metaDescription:
        parsed.metaDescription ||
        `Pelajari panduan ${keyword} terlengkap untuk target pembaca ${audience}.`,
      secondaryKeywords: Array.isArray(parsed.secondaryKeywords)
        ? parsed.secondaryKeywords
        : secondary,
      outline: Array.isArray(parsed.outline) ? parsed.outline : [],
    };
  } catch (err) {
    throw new Error(
      `Gagal memproses struktur JSON outline dari LLM: ${(err as Error).message}`
    );
  }
}

export async function generateArticle(
  params: GenerateArticleInput,
  config?: LlmRequestConfig
): Promise<GeneratedArticleResult> {
  const keyword = params.keyword.trim();
  const targetWords = Math.max(1000, Number(params.targetWordCount) || 1200);
  const lang = params.language === "en" ? "English" : "Bahasa Indonesia";
  const pov = params.pov || "anda";
  const audience = params.targetAudience.trim();
  const style = params.languageStyle.trim();

  // Stage 1: Get or generate outline
  const outlineData =
    params.customOutline && params.customOutline.outline?.length > 0
      ? params.customOutline
      : await generateOutline(params, config);

  const title = outlineData.title.trim();
  const slug = outlineData.slug.trim();
  const metaDescription = outlineData.metaDescription.trim();
  const secondaryList = outlineData.secondaryKeywords || [];

  const outlineText = outlineData.outline
    .map(
      (sec, i) =>
        `${i + 1}. H2: ${sec.heading} (target ~${sec.targetWords} kata)${
          sec.subheadings && sec.subheadings.length > 0
            ? `\n   Sub-poin H3: ${sec.subheadings.join(", ")}`
            : ""
        }`
    )
    .join("\n");

  // Stage 2: Write full article
  const systemPrompt = `Anda adalah penulis konten SEO editorial kelas atas.
Tugas Anda adalah menulis artikel mendalam, komprehensif, dan sangat bermanfaat dengan standar editorial ketat.
Bahasa: ${lang}.
Gaya Penulisan / Tone: ${style}.
Target Pembaca: ${audience}.
Sudut Pandang / Kata Ganti Sapaan: Gunakan '${pov}' secara konsisten.
Kata Kunci Utama: "${keyword}".
Kata Kunci Sekunder (LSI): ${secondaryList.join(", ")}.

SYARAT MUTLAK ARTIKEL:
1. PANJANG MINIMAL: Artikel ini WAJIB memiliki PANJANG MINIMAL ${targetWords} KATA TEKS BERSIH. Kembangkan setiap paragraf dengan detail praktis, contoh nyata, studi kasus, atau perbandingan agar tidak ringkas atau dangkal.
2. STRUKTUR HEADINGS:
   - Mulai dengan '# ${title}' sebagai satu-satunya H1.
   - Paragraf pembuka (100 kata pertama) WAJIB menyertakan kata kunci utama "${keyword}" secara natural.
   - Ikuti urutan bagian H2 dan H3 dari outline yang telah disusun.
   - Minimal 4 buah H2.
3. ANTI-AI-SLOP (LARANGAN KERAS):
   - JANGAN gunakan pembuka klise seperti "Di era digital yang serba cepat ini...", "Bukan rahasia lagi bahwa...", "Dalam artikel ini kita akan membahas...".
   - JANGAN gunakan kesimpulan klise seperti "Kesimpulannya, dapat disimpulkan bahwa...", "Akhir kata,...".
   - Tulis secara langsung, lugas, mengalir, dan bernuansa manusiawi.
4. FORMAT: Gunakan Markdown rapi (paragraf terpisah, bullet points secukupnya, tabel perbandingan jika relevan).`;

  const userPrompt = `Tulis artikel SEO lengkap dan mendalam sekarang berdasarkan outline ini:

Judul: ${title}
Meta Description: ${metaDescription}
Outline:
${outlineText}

${params.customInstructions ? `Instruksi Khusus Tambahan: ${params.customInstructions}` : ""}

PENTING: Pastikan isi artikel sangat kaya dan mencapai minimal ${targetWords} kata. Tulis artikel sekarang dalam Markdown:`;

  let currentContent = await callChatCompletion(
    {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    },
    config
  );

  // Stage 3: Auto-Expand Guardrail (ensure >= 1000 words or >= 90% of target)
  const minRequired = Math.min(1000, Math.floor(targetWords * 0.9));
  let currentWords = countWords(stripMarkdown(currentContent));
  let passes = 0;

  while (currentWords < minRequired && passes < 2) {
    passes++;
    const diff = targetWords - currentWords;

    const expandPrompt = `Artikel saat ini baru mencapai ${currentWords} kata (target minimal ${targetWords} kata; masih kurang sekitar ${diff} kata).
Perluas dan perdalam artikel ini tanpa mengulang kalimat yang sudah ada. 
Tambahkan contoh kasus praktis, langkah implementasi lebih detail pada sub-judul yang ada, tips tambahan, atau kembangkan bagian FAQ menjadi lebih komprehensif.
Pertahankan struktur judul dan gaya bahasa yang sama.
Tuliskan artikel versi lengkap yang sudah diperpanjang secara utuh dalam Markdown:

Artikel saat ini:
${currentContent}`;

    try {
      const expanded = await callChatCompletion(
        {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: expandPrompt },
          ],
          temperature: 0.7,
        },
        config
      );

      const newWordCount = countWords(stripMarkdown(expanded));
      if (newWordCount > currentWords) {
        currentContent = expanded;
        currentWords = newWordCount;
      } else {
        break;
      }
    } catch {
      // If expand pass fails, keep current content
      break;
    }
  }

  // Stage 4: Run SEO Analyzer
  const seoReport = analyzeSeo({
    keyword,
    secondaryKeywords: secondaryList,
    title,
    slug,
    metaDescription,
    content: currentContent,
  });

  return {
    title,
    slug,
    metaDescription,
    secondaryKeywords: JSON.stringify(secondaryList),
    outline: JSON.stringify(outlineData.outline),
    content: currentContent,
    wordCount: seoReport.wordCount,
    seoScore: seoReport.score,
    seoReport,
  };
}

export async function expandArticle(
  content: string,
  keyword: string,
  instructions?: string,
  config?: LlmRequestConfig
): Promise<string> {
  const currentWords = countWords(stripMarkdown(content));
  const systemPrompt = `Anda adalah editor konten senior. Tugas Anda adalah memperluas dan memperdalam artikel Markdown berikut tanpa merusak gaya bahasa yang ada. Tambahkan elaborasi penjelasan, contoh praktis, atau sub-poin penting tambahan.`;

  const userPrompt = `Perpanjang dan perdalam artikel Markdown berikut (panjang saat ini: ${currentWords} kata).
Kata kunci utama: "${keyword}".
${instructions ? `Instruksi khusus: ${instructions}` : ""}

Artikel saat ini:
${content}

Kirimkan kembali artikel versi lengkap yang sudah diperkaya dalam Markdown:`;

  return await callChatCompletion(
    {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    },
    config
  );
}
