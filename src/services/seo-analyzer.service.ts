export interface SeoInput {
  keyword: string;
  secondaryKeywords?: string | string[] | null;
  title: string;
  slug: string;
  metaDescription?: string | null;
  content: string;
}

export type CheckStatus = "pass" | "warn" | "fail";

export interface SeoCheckItem {
  id: string;
  title: string;
  status: CheckStatus;
  message: string;
  score: number;
}

export interface SeoReport {
  wordCount: number;
  readingTimeMinutes: number;
  keywordCount: number;
  keywordDensity: number;
  headings: {
    h1: number;
    h2: number;
    h3: number;
  };
  checks: SeoCheckItem[];
  score: number;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function stripMarkdown(markdown: string): string {
  if (!markdown) return "";
  return (
    markdown
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, " ")
      // Remove inline code
      .replace(/`([^`]+)`/g, "$1")
      // Remove images
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, " ")
      // Replace links with label
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      // Remove headings
      .replace(/^#{1,6}\s+/gm, " ")
      // Remove blockquotes
      .replace(/^\s*>\s+/gm, " ")
      // Remove list markers
      .replace(/^\s*[-*+]\s+/gm, " ")
      .replace(/^\s*\d+\.\s+/gm, " ")
      // Remove horizontal rules
      .replace(/^(?:---|\*\*\*|___)\s*$/gm, " ")
      // Remove formatting symbols: **bold**, *italic*, ~~strike~~
      .replace(/[*_~]{1,3}/g, "")
      // Remove HTML tags
      .replace(/<[^>]+>/g, " ")
      // Collapse whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

export function countWords(text: string): number {
  const clean = text.trim();
  if (!clean) return 0;
  return clean.split(/\s+/).filter(Boolean).length;
}

export function analyzeSeo(input: SeoInput): SeoReport {
  const cleanContent = stripMarkdown(input.content || "");
  const wordCount = countWords(cleanContent);
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const keyword = (input.keyword || "").trim().toLowerCase();
  const title = (input.title || "").trim();
  const slug = (input.slug || "").trim().toLowerCase();
  const metaDescription = (input.metaDescription || "").trim();

  // Headings analysis
  const lines = (input.content || "").split(/\r?\n/);
  const h1Lines: string[] = [];
  const h2Lines: string[] = [];
  const h3Lines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ")) {
      h1Lines.push(trimmed.slice(2).trim());
    } else if (trimmed.startsWith("## ")) {
      h2Lines.push(trimmed.slice(3).trim());
    } else if (trimmed.startsWith("### ")) {
      h3Lines.push(trimmed.slice(4).trim());
    }
  }

  // Keyword occurrences in clean content
  let keywordCount = 0;
  let keywordDensity = 0;
  if (keyword && cleanContent) {
    const escapedKeyword = escapeRegExp(keyword);
    const regex = new RegExp(`(?:^|\\W)${escapedKeyword}(?:$|\\W)`, "gi");
    const matches = cleanContent.toLowerCase().match(regex);
    keywordCount = matches ? matches.length : 0;
    const keywordWords = countWords(keyword);
    if (wordCount > 0) {
      keywordDensity = Number(
        (((keywordCount * keywordWords) / wordCount) * 100).toFixed(2)
      );
    }
  }

  // First 100 words
  const first100Words = cleanContent
    .split(/\s+/)
    .slice(0, 100)
    .join(" ")
    .toLowerCase();

  const checks: SeoCheckItem[] = [];

  // 1. Word Count >= 1000
  if (wordCount >= 1000) {
    checks.push({
      id: "word_count",
      title: "Panjang Artikel (Minimal 1.000 Kata)",
      status: "pass",
      message: `Panjang artikel ${wordCount.toLocaleString("id-ID")} kata (memenuhi syarat minimal 1.000 kata).`,
      score: 10,
    });
  } else if (wordCount >= 800) {
    checks.push({
      id: "word_count",
      title: "Panjang Artikel (Minimal 1.000 Kata)",
      status: "warn",
      message: `Panjang artikel ${wordCount.toLocaleString("id-ID")} kata (mendekati target, disarankan >= 1.000 kata).`,
      score: 5,
    });
  } else {
    checks.push({
      id: "word_count",
      title: "Panjang Artikel (Minimal 1.000 Kata)",
      status: "fail",
      message: `Panjang artikel baru ${wordCount.toLocaleString("id-ID")} kata (masih di bawah standar 1.000 kata).`,
      score: 0,
    });
  }

  // 2. Keyword in Title
  const hasKeywordInTitle = keyword && title.toLowerCase().includes(keyword);
  checks.push({
    id: "title_keyword",
    title: "Kata Kunci pada SEO Title",
    status: hasKeywordInTitle ? "pass" : "fail",
    message: hasKeywordInTitle
      ? "Kata kunci utama tercantum di dalam SEO Title."
      : "Kata kunci utama belum tercantum di dalam SEO Title.",
    score: hasKeywordInTitle ? 10 : 0,
  });

  // 3. Keyword in Meta Description
  const hasKeywordInMeta =
    keyword && metaDescription.toLowerCase().includes(keyword);
  checks.push({
    id: "meta_keyword",
    title: "Kata Kunci pada Meta Description",
    status: hasKeywordInMeta ? "pass" : "fail",
    message: hasKeywordInMeta
      ? "Kata kunci utama tercantum di dalam Meta Description."
      : "Kata kunci utama belum tercantum di dalam Meta Description.",
    score: hasKeywordInMeta ? 10 : 0,
  });

  // 4. Keyword in Slug
  const normalizedKeywordSlug = keyword.replace(/\s+/g, "-");
  const hasKeywordInSlug =
    slug && (slug.includes(normalizedKeywordSlug) || slug.includes(keyword));
  checks.push({
    id: "slug_keyword",
    title: "Kata Kunci pada URL Slug",
    status: hasKeywordInSlug ? "pass" : "fail",
    message: hasKeywordInSlug
      ? "URL slug memuat kata kunci utama."
      : "URL slug belum memuat kata kunci utama secara optimal.",
    score: hasKeywordInSlug ? 10 : 0,
  });

  // 5. Keyword in First 100 Words
  const hasKeywordInIntro = keyword && first100Words.includes(keyword);
  checks.push({
    id: "intro_keyword",
    title: "Kata Kunci di Paragraf Pembuka",
    status: hasKeywordInIntro ? "pass" : "fail",
    message: hasKeywordInIntro
      ? "Kata kunci utama muncul di 100 kata pertama artikel."
      : "Kata kunci utama belum muncul di 100 kata pertama.",
    score: hasKeywordInIntro ? 10 : 0,
  });

  // 6. Keyword in H2
  const hasKeywordInH2 =
    keyword &&
    h2Lines.some((line) => line.toLowerCase().includes(keyword));
  checks.push({
    id: "h2_keyword",
    title: "Kata Kunci pada Subheading (H2)",
    status: hasKeywordInH2 ? "pass" : "fail",
    message: hasKeywordInH2
      ? "Kata kunci utama ditemukan pada setidaknya satu sub-judul H2."
      : "Kata kunci utama belum ada di sub-judul H2 manapun.",
    score: hasKeywordInH2 ? 10 : 0,
  });

  // 7. Keyword Density (0.5% - 2.5%)
  if (keywordDensity >= 0.5 && keywordDensity <= 2.5) {
    checks.push({
      id: "keyword_density",
      title: "Kepadatan Kata Kunci (Keyword Density)",
      status: "pass",
      message: `Kepadatan keyword ${keywordDensity}% berada di rentang ideal (0.5% – 2.5%).`,
      score: 10,
    });
  } else if (
    (keywordDensity >= 0.3 && keywordDensity < 0.5) ||
    (keywordDensity > 2.5 && keywordDensity <= 3.5)
  ) {
    checks.push({
      id: "keyword_density",
      title: "Kepadatan Kata Kunci (Keyword Density)",
      status: "warn",
      message: `Kepadatan keyword ${keywordDensity}% mendekati batas ideal (0.5% – 2.5%).`,
      score: 5,
    });
  } else {
    checks.push({
      id: "keyword_density",
      title: "Kepadatan Kata Kunci (Keyword Density)",
      status: "fail",
      message: `Kepadatan keyword ${keywordDensity}% di luar rentang ideal (${keywordCount} kali kemunculan).`,
      score: 0,
    });
  }

  // 8. Title Length (45 - 65 chars)
  const titleLen = title.length;
  if (titleLen >= 45 && titleLen <= 65) {
    checks.push({
      id: "title_length",
      title: "Panjang SEO Title",
      status: "pass",
      message: `Panjang judul ${titleLen} karakter (ideal: 45–65 karakter).`,
      score: 10,
    });
  } else if (titleLen >= 35 && titleLen <= 75) {
    checks.push({
      id: "title_length",
      title: "Panjang SEO Title",
      status: "warn",
      message: `Panjang judul ${titleLen} karakter (sedikit di luar rentang ideal 45–65 karakter).`,
      score: 5,
    });
  } else {
    checks.push({
      id: "title_length",
      title: "Panjang SEO Title",
      status: "fail",
      message: `Panjang judul ${titleLen} karakter (terlalu pendek atau panjang; ideal: 45–65).`,
      score: 0,
    });
  }

  // 9. Meta Description Length (120 - 165 chars)
  const metaLen = metaDescription.length;
  if (metaLen >= 120 && metaLen <= 165) {
    checks.push({
      id: "meta_length",
      title: "Panjang Meta Description",
      status: "pass",
      message: `Panjang meta description ${metaLen} karakter (ideal: 120–165 karakter).`,
      score: 10,
    });
  } else if (metaLen >= 90 && metaLen <= 180) {
    checks.push({
      id: "meta_length",
      title: "Panjang Meta Description",
      status: "warn",
      message: `Panjang meta description ${metaLen} karakter (sedikit di luar rentang ideal 120–165).`,
      score: 5,
    });
  } else {
    checks.push({
      id: "meta_length",
      title: "Panjang Meta Description",
      status: "fail",
      message: `Panjang meta description ${metaLen} karakter (ideal: 120–165 karakter).`,
      score: 0,
    });
  }

  // 10. Heading Structure (h1 === 1 and h2 >= 4)
  const h1Count = h1Lines.length;
  const h2Count = h2Lines.length;
  const h3Count = h3Lines.length;

  if (h1Count === 1 && h2Count >= 4) {
    checks.push({
      id: "heading_structure",
      title: "Struktur Heading (H1 & H2)",
      status: "pass",
      message: `Struktur heading baik (${h1Count} H1, ${h2Count} H2, ${h3Count} H3).`,
      score: 10,
    });
  } else if (h1Count <= 1 && h2Count >= 2) {
    checks.push({
      id: "heading_structure",
      title: "Struktur Heading (H1 & H2)",
      status: "warn",
      message: `Struktur heading cukup (${h1Count} H1, ${h2Count} H2); disarankan minimal 4 H2.`,
      score: 5,
    });
  } else {
    checks.push({
      id: "heading_structure",
      title: "Struktur Heading (H1 & H2)",
      status: "fail",
      message: `Struktur heading belum ideal (${h1Count} H1, ${h2Count} H2). Diperlukan 1 H1 dan minimal 4 H2.`,
      score: 0,
    });
  }

  const totalScore = checks.reduce((sum, item) => sum + item.score, 0);

  return {
    wordCount,
    readingTimeMinutes,
    keywordCount,
    keywordDensity,
    headings: {
      h1: h1Count,
      h2: h2Count,
      h3: h3Count,
    },
    checks,
    score: totalScore,
  };
}
