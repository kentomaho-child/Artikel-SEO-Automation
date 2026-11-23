export interface LlmRequestConfig {
  apiKey?: string | null;
  baseUrl?: string | null;
  model?: string | null;
  mode?: "byok" | "free" | null;
}

export interface ResolvedLlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  isByok: boolean;
  isMock: boolean;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function isFreeModeAvailable(): boolean {
  if (process.env.LLM_MOCK === "true") return true;
  const key = process.env.LLM_API_KEY?.trim();
  return Boolean(key && key.length > 0);
}

export function getServerDefaultModel(): string {
  return process.env.LLM_MODEL || "gemini-2.5-flash";
}

export function resolveLlmConfig(
  requestConfig?: LlmRequestConfig
): ResolvedLlmConfig {
  const isMock = process.env.LLM_MOCK === "true";

  // Check if client provided BYOK credentials
  const clientKey = requestConfig?.apiKey?.trim() || "";
  const isByokMode = requestConfig?.mode === "byok" || Boolean(clientKey);

  if (isByokMode) {
    const baseUrl = (
      requestConfig?.baseUrl?.trim() || "https://api.openai.com/v1"
    ).replace(/\/+$/, "");
    const model = requestConfig?.model?.trim() || "gpt-4o-mini";

    if (!clientKey && !baseUrl.includes("localhost") && !baseUrl.includes("127.0.0.1") && !isMock) {
      throw new Error(
        "Mode API Sendiri (BYOK) aktif tetapi API Key belum diisi. Silakan masukkan API Key di Pengaturan API dashboard."
      );
    }

    return {
      apiKey: clientKey,
      baseUrl,
      model,
      isByok: true,
      isMock,
    };
  }

  // Fallback to Server Free-Tier
  const serverKey = process.env.LLM_API_KEY?.trim() || "";
  const serverBaseUrl = (
    process.env.LLM_BASE_URL?.trim() ||
    "https://generativelanguage.googleapis.com/v1beta/openai"
  ).replace(/\/+$/, "");
  const serverModel = process.env.LLM_MODEL?.trim() || "gemini-2.5-flash";

  if (!serverKey && !isMock) {
    throw new Error(
      "Mode Gratis server belum dikonfigurasi dan Anda belum memasukkan API Key sendiri. Silakan buka Pengaturan API di dashboard untuk memasukkan API Key Anda."
    );
  }

  return {
    apiKey: serverKey,
    baseUrl: serverBaseUrl,
    model: serverModel,
    isByok: false,
    isMock,
  };
}

export async function callChatCompletion(
  params: {
    messages: ChatMessage[];
    temperature?: number;
    jsonMode?: boolean;
    maxTokens?: number;
  },
  requestConfig?: LlmRequestConfig
): Promise<string> {
  const resolved = resolveLlmConfig(requestConfig);

  // Handle Mock Mode for tests or zero-cost simulation
  if (resolved.isMock) {
    return generateMockResponse(params);
  }

  const endpoint = `${resolved.baseUrl}/chat/completions`;
  const bodyPayload: Record<string, unknown> = {
    model: resolved.model,
    messages: params.messages,
    temperature: params.temperature ?? 0.7,
  };

  if (params.jsonMode) {
    bodyPayload.response_format = { type: "json_object" };
  }

  if (params.maxTokens) {
    bodyPayload.max_tokens = params.maxTokens;
  }

  let response: Response;
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (resolved.apiKey) {
      headers["Authorization"] = `Bearer ${resolved.apiKey}`;
    }

    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(bodyPayload),
    });
  } catch (netErr) {
    throw new Error(
      `Gagal terhubung ke penyedia LLM (${resolved.baseUrl}): ${(netErr as Error).message}`
    );
  }

  if (!response.ok) {
    let errBody = "";
    try {
      errBody = await response.text();
    } catch {}
    
    // Mask any accidental token leak in error output
    const safeError = errBody.replace(/sk-[a-zA-Z0-9_-]{8,}/g, "[MASKED_KEY]");
    throw new Error(
      `Penyedia LLM (${resolved.model}) mengembalikan status ${response.status}: ${safeError || response.statusText}`
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Penyedia LLM mengembalikan respon tanpa konten teks.");
  }

  return content.trim();
}

export async function testLlmConnection(
  config: LlmRequestConfig
): Promise<{ success: boolean; message: string; model: string }> {
  try {
    const reply = await callChatCompletion(
      {
        messages: [
          {
            role: "user",
            content: "Halo, ini tes koneksi singkat. Balas dengan kata 'OK'.",
          },
        ],
        maxTokens: 10,
        temperature: 0.1,
      },
      config
    );

    const resolved = resolveLlmConfig(config);
    return {
      success: true,
      message: `Koneksi berhasil! Respon model: "${reply}"`,
      model: resolved.model,
    };
  } catch (err) {
    return {
      success: false,
      message: (err as Error).message,
      model: config.model || "unknown",
    };
  }
}

function generateMockResponse(params: {
  messages: ChatMessage[];
  jsonMode?: boolean;
}): string {
  const userMsg =
    params.messages.find((m) => m.role === "user")?.content || "";
  const match = userMsg.match(/Kata Kunci(?: Utama)?:\s*["']?([^"'\n\r]+)["']?/i);
  const keyword = match && match[1]?.trim() ? match[1].trim().replace(/["']/g, "") : "Peluang Bisnis Online";
  const prompt = params.messages.map((m) => m.content).join(" ");

  // If asking for outline (jsonMode or explicit outline instruction)
  if (params.jsonMode || prompt.includes("Rancang outline SEO") || prompt.includes("JSON murni")) {
    const slug = keyword
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return JSON.stringify({
      title: `${keyword}: Panduan Lengkap dan Terpercaya 2026`,
      slug,
      metaDescription: `Pelajari panduan ${keyword} terlengkap ini untuk meraih hasil maksimal dengan strategi taktis, efisien, dan terbukti berhasil.`,
      secondaryKeywords: [
        `${keyword} pemula`,
        `tips ${keyword}`,
        `cara menerapkan ${keyword}`,
        `langkah sukses ${keyword}`,
      ],
      outline: [
        {
          heading: `Mengapa ${keyword} Sangat Penting di Era Sekarang`,
          targetWords: 250,
          subheadings: ["Tantangan Umum yang Dihadapi", "Manfaat Utama Penerapan"],
        },
        {
          heading: `Fondasi Utama dan Konsep Dasar ${keyword}`,
          targetWords: 300,
          subheadings: ["Prinsip Kerja", "Komponen yang Harus Disiapkan"],
        },
        {
          heading: `Panduan Langkah demi Langkah Menerapkan ${keyword}`,
          targetWords: 350,
          subheadings: ["Tahap Persiapan", "Eksekusi Praktis", "Evaluasi Mingguan"],
        },
        {
          heading: `Kesalahan Umum dalam Menerapkan ${keyword} dan Solusinya`,
          targetWords: 250,
          subheadings: ["Kekeliruan Strategi", "Cara Mengatasinya"],
        },
        {
          heading: `Tanya Jawab Seputar ${keyword} (FAQ)`,
          targetWords: 200,
          subheadings: ["Berapa lama melihat hasil?", "Apakah butuh biaya besar?"],
        },
      ],
    });
  }

  // Otherwise, return full article (> 1050 words)
  const articleTitle = `${keyword}: Panduan Lengkap dan Terpercaya 2026`;

  const filler1 = `Dalam lanskap kompetitif hari ini, memahami ${keyword} secara menyeluruh bukan lagi sekadar pilihan tambahan, melainkan keharusan strategis. Banyak praktisi dan pemilik bisnis sering kali merasa kewalahan saat memulai karena banyaknya informasi yang tersebar tanpa struktur yang runut. Namun ketika Anda memecah prosesnya ke dalam langkah-langkah terukur, tujuan yang tampak sulit dapat dicapai dengan hasil yang konsisten. Pemahaman mendalam tentang audiens target, tujuan bisnis jangka panjang, dan alokasi sumber daya yang bijak adalah fondasi utama yang membedakan keberhasilan sejati dari upaya sporadis yang membuang waktu dan biaya.`;

  const filler2 = `Setiap tahap implementasi membutuhkan disiplin operasional dan pengukuran berbasis data. Jangan tergoda untuk mengambil jalan pintas yang hanya memberikan hasil instan semu namun merusak reputasi di kemudian hari. Fokuslah membangun aset konten yang menjawab kebutuhan nyata pembaca, menyajikan solusi praktis, dan memberikan nilai tambah yang tidak ditemukan pada sumber lain. Dengan konsistensi yang terjaga, visibilitas dan kredibilitas akan terbentuk secara alami, membawa dampak positif terhadap pertumbuhan berkelanjutan bagi organisasi maupun individu yang menjalankannya secara tekun.`;

  const filler3 = `Analisis berkala merupakan bagian yang tidak boleh diabaikan. Evaluasi metrik kinerja utama secara objektif dan lakukan penyesuaian taktik saat data menunjukkan adanya pergeseran minat atau kebiasaan audiens. Kolaborasi tim yang solid, dokumentasi proses yang rapi, serta kemauan untuk terus memperbarui wawasan akan menjadi modal berharga dalam menghadapi setiap dinamika perubahan yang pasti terjadi di masa depan.`;

  return `# ${articleTitle}

${keyword} merupakan salah satu aspek paling krusial yang menentukan keberhasilan strategi pertumbuhan Anda. Di dalam panduan ini, Anda akan mempelajari langkah-langkah praktis dan teruji untuk menerapkan ${keyword} secara efektif dan berkelanjutan.

## Mengapa ${keyword} Sangat Penting Hari Ini

${filler1}

${filler2}

### Manfaat Jangka Panjang untuk Bisnis dan Karier

${filler3}

${filler1}

## Prinsip dan Pondasi Dasar ${keyword}

${filler2}

${keyword} harus dibangun di atas pemahaman yang kuat tentang target audiens dan nilai inti yang ingin Anda sampaikan. Ketika dasar ini kokoh, strategi lanjutan dapat dijalankan dengan presisi tinggi.

${filler3}

### Menyiapkan Instrumen dan Alat Bantu yang Tepat

${filler1}

${filler2}

## Langkah demi Langkah Menerapkan ${keyword} Secara Praktis

Berikut adalah tahapan terstruktur yang dapat langsung Anda terapkan mulai hari ini:

1. **Riset Mendalam**: Kumpulkan data akurat tentang kebutuhan audiens serta kata kunci turunan yang relevan.
2. **Penyusunan Rencana Aksi**: Buat jadwal kerja yang realistis dan alokasikan sumber daya secara proporsional.
3. **Eksekusi Bertahap**: Jalankan rencana tanpa menunda dan pastikan setiap standar kualitas terpenuhi dengan baik.
4. **Monitoring dan Evaluasi**: Pantau metrik keberhasilan secara teratur dan buat catatan perbaikan.

${filler3}

${filler1}

## Kesalahan Umum dalam Mengelola ${keyword} dan Cara Menghindarinya

Banyak orang terjebak pada asumsi keliru bahwa hasil besar bisa didapatkan tanpa proses yang konsisten. Hindari over-optimasi dan fokuslah pada kualitas penyampaian informasi yang mudah dipahami.

${filler2}

${filler3}

## Pertanyaan yang Sering Diajukan (FAQ) Mengenai ${keyword}

### Apakah pemula dapat menerapkan ${keyword} tanpa pengalaman teknis?
Tentu saja. Dengan mengikuti panduan langkah demi langkah dan fokus pada hal-hal mendasar terlebih dahulu, pemula dapat mencapai kemajuan signifikan tanpa harus menguasai aspek teknis yang rumit.

### Berapa lama waktu yang dibutuhkan untuk melihat hasil nyata?
Hasil umumnya mulai terlihat dalam waktu beberapa minggu hingga bulan, tergantung pada konsistensi eksekusi dan tingkat persaingan di bidang Anda.

## Kesimpulan dan Langkah Selanjutnya

Menerapkan ${keyword} dengan pendekatan terencana dan terukur adalah investasi terbaik untuk memastikan keberlanjutan hasil Anda. Mulailah dari langkah terkecil hari ini, pantau progresnya secara berkala, dan jangan ragu melakukan penyesuaian seiring bertambahnya wawasan Anda.`;
}
