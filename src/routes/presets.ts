import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../db";
import { stylePresets } from "../db/schema";
import { defaultPresets } from "../db/seed";

export const presetRoutes = new Elysia({ prefix: "/api/presets" })
  .get("/", async () => {
    try {
      const records = await db.select().from(stylePresets);
      if (records.length === 0) {
        return defaultPresets.map((p, idx) => ({ ...p, id: idx + 1 }));
      }
      return records;
    } catch {
      return defaultPresets.map((p, idx) => ({ ...p, id: idx + 1 }));
    }
  })
  .post(
    "/",
    async ({ body, set }) => {
      try {
        const [inserted] = await db
          .insert(stylePresets)
          .values({
            name: body.name.trim(),
            targetAudience: body.targetAudience.trim(),
            languageStyle: body.languageStyle.trim(),
            language: body.language || "id",
            pov: body.pov || "anda",
            customInstructions: body.customInstructions?.trim() || null,
          })
          .$returningId();

        set.status = 201;
        return {
          id: inserted?.id,
          name: body.name,
          targetAudience: body.targetAudience,
          languageStyle: body.languageStyle,
          language: body.language || "id",
          pov: body.pov || "anda",
          customInstructions: body.customInstructions || null,
        };
      } catch (err) {
        set.status = 500;
        return { error: (err as Error).message };
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        targetAudience: t.String({ minLength: 1 }),
        languageStyle: t.String({ minLength: 1 }),
        language: t.Optional(t.String()),
        pov: t.Optional(t.String()),
        customInstructions: t.Optional(t.String()),
      }),
    }
  )
  .delete("/:id", async ({ params, set }) => {
    const id = Number(params.id);
    if (!id || Number.isNaN(id)) {
      set.status = 400;
      return { error: "ID tidak valid" };
    }

    try {
      await db.delete(stylePresets).where(eq(stylePresets.id, id));
      return { success: true };
    } catch (err) {
      set.status = 500;
      return { error: (err as Error).message };
    }
  });
