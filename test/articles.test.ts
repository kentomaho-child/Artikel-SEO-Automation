import { beforeAll, describe, expect, it } from "bun:test";
import { app } from "../src";

beforeAll(() => {
  process.env.LLM_MOCK = "true";
  process.env.FREE_DAILY_LIMIT = "3";
});

describe("Articles & AI Routes (with Mock LLM)", () => {
  it("GET /api/llm/status returns LLM availability and remaining quota", async () => {
    const res = await app.handle(new Request("http://localhost/api/llm/status"));
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      freeModeAvailable: boolean;
      dailyLimit: number;
      usedToday: number;
      remainingToday: number;
      serverModel: string;
    };
    expect(data.freeModeAvailable).toBe(true);
    expect(data.dailyLimit).toBeGreaterThanOrEqual(1);
    expect(data.serverModel).toBeDefined();
  });

  it("POST /api/llm/test validates BYOK connection test", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/llm/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-llm-api-key": "test-key-123",
          "x-llm-model": "gpt-4o-mini",
        },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { success: boolean; model: string };
    expect(data.success).toBe(true);
  });

  it("GET /api/presets returns default and custom presets", async () => {
    const res = await app.handle(new Request("http://localhost/api/presets"));
    expect(res.status).toBe(200);
    const list = (await res.json()) as Array<{ name: string; targetAudience: string }>;
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it("POST /api/articles/outline generates structured outline JSON", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/articles/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: "Peluang Usaha Kuliner",
          targetAudience: "Pelaku UMKM dan pemula",
          languageStyle: "conversational",
          language: "id",
          pov: "anda",
          targetWordCount: 1200,
        }),
      })
    );
    expect(res.status).toBe(200);
    const outline = (await res.json()) as {
      title: string;
      slug: string;
      outline: Array<{ heading: string }>;
    };
    expect(outline.title).toBeDefined();
    expect(outline.slug).toBeDefined();
    expect(Array.isArray(outline.outline)).toBe(true);
    expect(outline.outline.length).toBeGreaterThan(0);
  });

  it("POST /api/articles/generate creates complete article >= 1000 words with SEO report", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/articles/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: "Peluang Usaha Kuliner",
          targetAudience: "Pelaku UMKM dan pemula",
          languageStyle: "conversational",
          language: "id",
          pov: "anda",
          targetWordCount: 1200,
        }),
      })
    );
    expect(res.status).toBe(201);
    const article = (await res.json()) as {
      id: number;
      title: string;
      slug: string;
      wordCount: number;
      seoScore: number;
      seoReport: { checks: Array<{ id: string }> };
    };
    expect(article.id).toBeDefined();
    expect(article.wordCount).toBeGreaterThanOrEqual(1000);
    expect(article.seoScore).toBeGreaterThanOrEqual(70);
    expect(article.seoReport).toBeDefined();

    // Verify GET /api/articles list includes the new article
    const listRes = await app.handle(new Request("http://localhost/api/articles"));
    expect(listRes.status).toBe(200);
    const list = (await listRes.json()) as Array<{ id: number }>;
    expect(list.some((a) => a.id === article.id)).toBe(true);

    // Verify GET /api/articles/:id
    const detailRes = await app.handle(
      new Request(`http://localhost/api/articles/${article.id}`)
    );
    expect(detailRes.status).toBe(200);

    // Verify PATCH /api/articles/:id updates content and recalculates SEO
    const patchRes = await app.handle(
      new Request(`http://localhost/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Peluang Usaha Kuliner Terlengkap dan Paling Menguntungkan",
        }),
      })
    );
    expect(patchRes.status).toBe(200);
    const patched = (await patchRes.json()) as { title: string; seoScore: number };
    expect(patched.title).toContain("Peluang Usaha Kuliner Terlengkap");
    expect(patched.seoScore).toBeGreaterThan(0);

    // Verify GET /api/articles/:id/export?format=md
    const exportMdRes = await app.handle(
      new Request(`http://localhost/api/articles/${article.id}/export?format=md`)
    );
    expect(exportMdRes.status).toBe(200);
    const mdText = await exportMdRes.text();
    expect(mdText).toContain("---");
    expect(mdText).toContain("Peluang Usaha Kuliner");

    // Verify GET /api/articles/:id/export?format=html
    const exportHtmlRes = await app.handle(
      new Request(`http://localhost/api/articles/${article.id}/export?format=html`)
    );
    expect(exportHtmlRes.status).toBe(200);
    const htmlText = await exportHtmlRes.text();
    expect(htmlText).toContain("<!DOCTYPE html>");

    // Verify DELETE /api/articles/:id
    const delRes = await app.handle(
      new Request(`http://localhost/api/articles/${article.id}`, {
        method: "DELETE",
      })
    );
    expect(delRes.status).toBe(200);
  });

  it("rejects generate request with invalid input (e.g. targetWordCount < 1000)", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/articles/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: "K",
          targetAudience: "Audience",
          languageStyle: "santai",
          targetWordCount: 500, // Invalid, below minimum 1000
        }),
      })
    );
    expect(res.status).toBe(422); // Elysia validation error
  });
});
