import { desc, eq, like } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { marked } from "marked";
import { db } from "../db";
import { articles, type Article } from "../db/schema";
import {
  expandArticle,
  generateArticle,
  generateOutline,
  type GeneratedOutline,
} from "../services/article-generator.service";
import type { LlmRequestConfig } from "../services/llm.service";
import {
  checkAndIncrementArticle,
  checkAndIncrementOutline,
} from "../services/rate-limit.service";
import { analyzeSeo, type SeoReport } from "../services/seo-analyzer.service";

// In-memory fallback for local testing if MySQL is offline
const memoryArticles = new Map<number, Article>();
let nextMemId = 1;

function extractLlmConfig(headers: Record<string, string | undefined>): {
  config: LlmRequestConfig;
  isByok: boolean;
  clientIp: string;
} {
  const apiKey = headers["x-llm-api-key"]?.trim() || undefined;
  const baseUrl = headers["x-llm-base-url"]?.trim() || undefined;
  const model = headers["x-llm-model"]?.trim() || undefined;
  const modeHeader = headers["x-llm-mode"]?.trim();
  const isByok = modeHeader === "byok" || Boolean(apiKey);
  const clientIp =
    headers["x-forwarded-for"]?.split(",")[0]?.trim() || "127.0.0.1";

  return {
    config: {
      apiKey,
      baseUrl,
      model,
      mode: isByok ? "byok" : "free",
    },
    isByok,
    clientIp,
  };
}

export const articleRoutes = new Elysia({ prefix: "/api/articles" })
  .post(
    "/outline",
    async ({ headers, body, set }) => {
      const { config, isByok, clientIp } = extractLlmConfig(headers);

      // Rate limit check for Free Mode
      if (!isByok && process.env.LLM_MOCK !== "true") {
        const check = await checkAndIncrementOutline(clientIp);
        if (!check.allowed) {
          set.status = 429;
          return {
            error:
              "Batas kuota harian gratis untuk pembuatan outline telah tercapai hari ini. Silakan masukkan API Key Anda di Pengaturan API untuk melanjutkan tanpa batas.",
            remainingToday: 0,
          };
        }
      }

      try {
        const outline = await generateOutline(body, config);
        return outline;
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      body: t.Object({
        keyword: t.String({ minLength: 2 }),
        targetAudience: t.String({ minLength: 2 }),
        languageStyle: t.String({ minLength: 2 }),
        language: t.Optional(t.String()),
        pov: t.Optional(t.String()),
        targetWordCount: t.Optional(t.Number({ minimum: 1000 })),
        secondaryKeywords: t.Optional(
          t.Union([t.String(), t.Array(t.String())])
        ),
        customInstructions: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/generate",
    async ({ headers, body, set }) => {
      const { config, isByok, clientIp } = extractLlmConfig(headers);

      // Rate limit check for Free Mode
      if (!isByok && process.env.LLM_MOCK !== "true") {
        const check = await checkAndIncrementArticle(clientIp);
        if (!check.allowed) {
          set.status = 429;
          return {
            error:
              "Batas kuota harian gratis Anda telah habis hari ini (maksimal 3 artikel per hari). Masukkan API Key Anda sendiri di menu Pengaturan API untuk membuat artikel tanpa batas.",
            remainingToday: 0,
          };
        }
      }

      try {
        const result = await generateArticle(body, config);

        // Save to database (or fallback memory)
        const articleData = {
          keyword: body.keyword.trim(),
          secondaryKeywords: result.secondaryKeywords,
          title: result.title,
          slug: result.slug,
          metaDescription: result.metaDescription,
          targetAudience: body.targetAudience.trim(),
          languageStyle: body.languageStyle.trim(),
          language: body.language || "id",
          pov: body.pov || "anda",
          customInstructions: body.customInstructions?.trim() || null,
          targetWordCount: Math.max(1000, body.targetWordCount || 1200),
          outline: result.outline,
          content: result.content,
          wordCount: result.wordCount,
          seoScore: result.seoScore,
          seoReport: JSON.stringify(result.seoReport),
          status: "completed",
          errorMessage: null,
        };

        try {
          const [inserted] = await db
            .insert(articles)
            .values(articleData)
            .$returningId();

          const createdId = inserted?.id || nextMemId++;
          set.status = 201;
          return {
            id: createdId,
            ...articleData,
            seoReport: result.seoReport,
            outline: JSON.parse(result.outline),
          };
        } catch {
          // Fallback to memory
          const id = nextMemId++;
          const memRecord: Article = {
            id,
            ...articleData,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          memoryArticles.set(id, memRecord);
          set.status = 201;
          return {
            id,
            ...articleData,
            seoReport: result.seoReport,
            outline: JSON.parse(result.outline),
          };
        }
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      body: t.Object({
        keyword: t.String({ minLength: 2 }),
        targetAudience: t.String({ minLength: 2 }),
        languageStyle: t.String({ minLength: 2 }),
        language: t.Optional(t.String()),
        pov: t.Optional(t.String()),
        targetWordCount: t.Optional(t.Number({ minimum: 1000 })),
        secondaryKeywords: t.Optional(
          t.Union([t.String(), t.Array(t.String())])
        ),
        customInstructions: t.Optional(t.String()),
        customOutline: t.Optional(t.Any()),
      }),
    }
  )
  .get("/", async ({ query }) => {
    const search = query?.search?.trim() || "";
    const statusFilter = query?.status?.trim() || "";

    try {
      let q = db.select().from(articles).$dynamic();
      if (search) {
        q = q.where(like(articles.title, `%${search}%`));
      }
      if (statusFilter && statusFilter !== "all") {
        q = q.where(eq(articles.status, statusFilter));
      }
      const records = await q.orderBy(desc(articles.id));
      return records.map((item) => ({
        ...item,
        seoReport: item.seoReport ? safeJsonParse(item.seoReport) : null,
      }));
    } catch {
      // Memory fallback
      let list = Array.from(memoryArticles.values()).reverse();
      if (search) {
        list = list.filter((a) =>
          a.title.toLowerCase().includes(search.toLowerCase())
        );
      }
      if (statusFilter && statusFilter !== "all") {
        list = list.filter((a) => a.status === statusFilter);
      }
      return list.map((item) => ({
        ...item,
        seoReport: item.seoReport ? safeJsonParse(item.seoReport) : null,
      }));
    }
  })
  .get("/:id", async ({ params, set }) => {
    const id = Number(params.id);
    if (!id || Number.isNaN(id)) {
      set.status = 400;
      return { error: "ID artikel tidak valid" };
    }

    try {
      const records = await db
        .select()
        .from(articles)
        .where(eq(articles.id, id))
        .limit(1);

      if (records.length === 0 || !records[0]) {
        const mem = memoryArticles.get(id);
        if (!mem) {
          set.status = 404;
          return { error: "Artikel tidak ditemukan" };
        }
        return {
          ...mem,
          seoReport: mem.seoReport ? safeJsonParse(mem.seoReport) : null,
          outline: mem.outline ? safeJsonParse(mem.outline) : null,
        };
      }

      const item = records[0];
      return {
        ...item,
        seoReport: item.seoReport ? safeJsonParse(item.seoReport) : null,
        outline: item.outline ? safeJsonParse(item.outline) : null,
      };
    } catch {
      const mem = memoryArticles.get(id);
      if (!mem) {
        set.status = 404;
        return { error: "Artikel tidak ditemukan" };
      }
      return {
        ...mem,
        seoReport: mem.seoReport ? safeJsonParse(mem.seoReport) : null,
        outline: mem.outline ? safeJsonParse(mem.outline) : null,
      };
    }
  })
  .patch(
    "/:id",
    async ({ params, body, set }) => {
      const id = Number(params.id);
      if (!id || Number.isNaN(id)) {
        set.status = 400;
        return { error: "ID artikel tidak valid" };
      }

      let existingArticle: Article | undefined;
      try {
        const records = await db
          .select()
          .from(articles)
          .where(eq(articles.id, id))
          .limit(1);
        existingArticle = records[0];
      } catch {
        existingArticle = memoryArticles.get(id);
      }

      if (!existingArticle) {
        existingArticle = memoryArticles.get(id);
      }

      if (!existingArticle) {
        set.status = 404;
        return { error: "Artikel tidak ditemukan" };
      }

      const updatedTitle = body.title !== undefined ? body.title : existingArticle.title;
      const updatedSlug = body.slug !== undefined ? body.slug : existingArticle.slug;
      const updatedMeta =
        body.metaDescription !== undefined
          ? body.metaDescription
          : existingArticle.metaDescription;
      const updatedContent =
        body.content !== undefined ? body.content : existingArticle.content;

      // Recalculate SEO report
      const seoReport = analyzeSeo({
        keyword: existingArticle.keyword,
        title: updatedTitle,
        slug: updatedSlug,
        metaDescription: updatedMeta,
        content: updatedContent,
      });

      const patchData = {
        title: updatedTitle,
        slug: updatedSlug,
        metaDescription: updatedMeta,
        content: updatedContent,
        wordCount: seoReport.wordCount,
        seoScore: seoReport.score,
        seoReport: JSON.stringify(seoReport),
        updatedAt: new Date(),
      };

      try {
        await db.update(articles).set(patchData).where(eq(articles.id, id));
      } catch {
        // Memory fallback
        const current = memoryArticles.get(id);
        if (current) {
          memoryArticles.set(id, { ...current, ...patchData });
        }
      }

      return {
        ...existingArticle,
        ...patchData,
        seoReport,
      };
    },
    {
      body: t.Object({
        title: t.Optional(t.String()),
        slug: t.Optional(t.String()),
        metaDescription: t.Optional(t.String()),
        content: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/:id/expand",
    async ({ headers, params, body, set }) => {
      const id = Number(params.id);
      if (!id || Number.isNaN(id)) {
        set.status = 400;
        return { error: "ID artikel tidak valid" };
      }

      const { config, isByok, clientIp } = extractLlmConfig(headers);

      if (!isByok && process.env.LLM_MOCK !== "true") {
        const check = await checkAndIncrementOutline(clientIp);
        if (!check.allowed) {
          set.status = 429;
          return {
            error:
              "Batas kuota harian gratis Anda telah habis. Gunakan API Key Anda sendiri di Pengaturan API untuk melanjutkan.",
            remainingToday: 0,
          };
        }
      }

      let existingArticle: Article | undefined;
      try {
        const records = await db
          .select()
          .from(articles)
          .where(eq(articles.id, id))
          .limit(1);
        existingArticle = records[0];
      } catch {
        existingArticle = memoryArticles.get(id);
      }

      if (!existingArticle) {
        existingArticle = memoryArticles.get(id);
      }

      if (!existingArticle) {
        set.status = 404;
        return { error: "Artikel tidak ditemukan" };
      }

      try {
        const expandedContent = await expandArticle(
          existingArticle.content,
          existingArticle.keyword,
          body?.instructions,
          config
        );

        const seoReport = analyzeSeo({
          keyword: existingArticle.keyword,
          title: existingArticle.title,
          slug: existingArticle.slug,
          metaDescription: existingArticle.metaDescription,
          content: expandedContent,
        });

        const patchData = {
          content: expandedContent,
          wordCount: seoReport.wordCount,
          seoScore: seoReport.score,
          seoReport: JSON.stringify(seoReport),
          updatedAt: new Date(),
        };

        try {
          await db.update(articles).set(patchData).where(eq(articles.id, id));
        } catch {
          const current = memoryArticles.get(id);
          if (current) {
            memoryArticles.set(id, { ...current, ...patchData });
          }
        }

        return {
          ...existingArticle,
          ...patchData,
          seoReport,
        };
      } catch (err) {
        set.status = 400;
        return { error: (err as Error).message };
      }
    },
    {
      body: t.Optional(
        t.Object({
          instructions: t.Optional(t.String()),
        })
      ),
    }
  )
  .delete("/:id", async ({ params, set }) => {
    const id = Number(params.id);
    if (!id || Number.isNaN(id)) {
      set.status = 400;
      return { error: "ID artikel tidak valid" };
    }

    try {
      await db.delete(articles).where(eq(articles.id, id));
    } catch {
      memoryArticles.delete(id);
    }
    memoryArticles.delete(id);

    return { success: true };
  })
  .get("/:id/export", async ({ params, query, set }) => {
    const id = Number(params.id);
    if (!id || Number.isNaN(id)) {
      set.status = 400;
      return "ID artikel tidak valid";
    }

    let existing: Article | undefined;
    try {
      const records = await db
        .select()
        .from(articles)
        .where(eq(articles.id, id))
        .limit(1);
      existing = records[0];
    } catch {
      existing = memoryArticles.get(id);
    }
    if (!existing) existing = memoryArticles.get(id);

    if (!existing) {
      set.status = 404;
      return "Artikel tidak ditemukan";
    }

    const format = query?.format === "html" ? "html" : "md";
    const filename = `${existing.slug || "artikel"}.${format}`;

    if (format === "html") {
      const htmlBody = marked.parse(existing.content || "");
      const fullHtml = `<!DOCTYPE html>
<html lang="${existing.language || "id"}">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(existing.title)}</title>
  <meta name="description" content="${escapeHtml(existing.metaDescription || "")}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Georgia, serif; line-height: 1.8; max-width: 72ch; margin: 40px auto; padding: 0 20px; color: #18181b; }
    h1, h2, h3 { line-height: 1.3; color: #111; }
    code { background: #f4f4f5; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
${htmlBody}
</body>
</html>`;

      set.headers["Content-Type"] = "text/html; charset=utf-8";
      set.headers["Content-Disposition"] = `attachment; filename="${filename}"`;
      return fullHtml;
    }

    // Markdown export with frontmatter
    const mdContent = `---
title: "${existing.title.replace(/"/g, '\\"')}"
slug: "${existing.slug}"
metaDescription: "${(existing.metaDescription || "").replace(/"/g, '\\"')}"
keyword: "${existing.keyword}"
targetAudience: "${existing.targetAudience}"
wordCount: ${existing.wordCount}
seoScore: ${existing.seoScore}
---

${existing.content}
`;

    set.headers["Content-Type"] = "text/markdown; charset=utf-8";
    set.headers["Content-Disposition"] = `attachment; filename="${filename}"`;
    return mdContent;
  });

function safeJsonParse(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
