import { describe, expect, it } from "bun:test";
import {
  analyzeSeo,
  countWords,
  stripMarkdown,
} from "../src/services/seo-analyzer.service";

describe("SEO Analyzer Service", () => {
  it("stripMarkdown removes markdown syntax and keeps readable text", () => {
    const md = `# Judul Utama
Ini **teks tebal** dan *teks miring* serta [tautan ini](https://example.com).

\`\`\`ts
const x = 10;
\`\`\`

> Kutipan penting

- Item 1
- Item 2
`;
    const clean = stripMarkdown(md);
    expect(clean).toContain("Judul Utama");
    expect(clean).toContain("Ini teks tebal dan teks miring serta tautan ini");
    expect(clean).toContain("Kutipan penting");
    expect(clean).not.toContain("```");
    expect(clean).not.toContain("# ");
    expect(clean).not.toContain("**");
    expect(clean).not.toContain("https://example.com");
  });

  it("countWords calculates correct word count", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
    expect(countWords("Satu dua tiga empat lima")).toBe(5);
  });

  it("evaluates a short article (< 1000 words) with failing word_count check", () => {
    const report = analyzeSeo({
      keyword: "bisnis online",
      title: "Panduan Lengkap Bisnis Online Bagi Pemula",
      slug: "panduan-lengkap-bisnis-online",
      metaDescription: "Pelajari cara memulai bisnis online dari nol dengan langkah praktis.",
      content: "# Panduan Bisnis Online\n\nIni artikel singkat tentang bisnis online.",
    });

    const wordCountCheck = report.checks.find((c) => c.id === "word_count");
    expect(wordCountCheck).toBeDefined();
    expect(wordCountCheck?.status).toBe("fail");
    expect(report.wordCount).toBeLessThan(800);
    expect(report.score).toBeLessThan(70);
  });

  it("evaluates a comprehensive article (>= 1000 words) with high SEO score", () => {
    // Generate an article with ~1050 words containing the keyword appropriately
    const keyword = "strategi pemasaran digital";
    const title = "Strategi Pemasaran Digital Terbaik untuk Bisnis Modern 2026";
    const slug = "strategi-pemasaran-digital-terbaik";
    const metaDescription =
      "Pelajari panduan strategi pemasaran digital terlengkap untuk meningkatkan penjualan dan visibilitas merek bisnis Anda secara terukur.";

    const bodyParagraph = `Dalam era modern, ${keyword} menjadi pondasi utama keberhasilan setiap bisnis yang ingin bertumbuh secara berkelanjutan. Melalui penerapan taktik yang tepat, tim pemasaran dapat menjangkau pelanggan potensial secara efisien. `;
    
    // Repeat body to exceed 1000 words
    const repeatParagraphs = Array(12)
      .fill(
        "Pemasaran berbasis data memungkinkan pengoptimalan anggaran promosi tanpa pemborosan. Setiap kampanye perlu diukur berdasarkan metrik konversi dan kepuasan pelanggan secara berkala. Berbagai instrumen seperti optimasi mesin pencari, media sosial, dan email newsletter terbukti efektif ketika dikombinasikan dengan pesan yang relevan."
      )
      .join("\n\n");

    const content = `# Panduan ${keyword} Terlengkap

${bodyParagraph}

## Mengenal Dasar ${keyword}

${repeatParagraphs}

## Langkah Implementasi ${keyword}

${repeatParagraphs}

## Analisis Kinerja dan Metrik Keberhasilan

${repeatParagraphs}

## Kesimpulan dan Rencana Aksi

${repeatParagraphs}
`;

    const report = analyzeSeo({
      keyword,
      title,
      slug,
      metaDescription,
      content,
    });

    expect(report.wordCount).toBeGreaterThanOrEqual(1000);
    const wordCountCheck = report.checks.find((c) => c.id === "word_count");
    expect(wordCountCheck?.status).toBe("pass");

    const titleCheck = report.checks.find((c) => c.id === "title_keyword");
    expect(titleCheck?.status).toBe("pass");

    const metaCheck = report.checks.find((c) => c.id === "meta_keyword");
    expect(metaCheck?.status).toBe("pass");

    const slugCheck = report.checks.find((c) => c.id === "slug_keyword");
    expect(slugCheck?.status).toBe("pass");

    const introCheck = report.checks.find((c) => c.id === "intro_keyword");
    expect(introCheck?.status).toBe("pass");

    const h2Check = report.checks.find((c) => c.id === "h2_keyword");
    expect(h2Check?.status).toBe("pass");

    expect(report.headings.h1).toBe(1);
    expect(report.headings.h2).toBeGreaterThanOrEqual(4);
    expect(report.score).toBeGreaterThanOrEqual(80);
  });
});
