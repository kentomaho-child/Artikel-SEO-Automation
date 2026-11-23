import { Elysia, t } from "elysia";
import {
  getServerDefaultModel,
  isFreeModeAvailable,
  testLlmConnection,
  type LlmRequestConfig,
} from "../services/llm.service";
import { getClientUsage } from "../services/rate-limit.service";

export const llmRoutes = new Elysia({ prefix: "/api/llm" })
  .get("/status", async ({ headers }) => {
    const clientIp =
      headers["x-forwarded-for"]?.split(",")[0]?.trim() || "127.0.0.1";
    const usage = await getClientUsage(clientIp);
    const freeAvailable = isFreeModeAvailable();

    return {
      freeModeAvailable: freeAvailable,
      dailyLimit: usage.dailyLimit,
      usedToday: usage.articleCount,
      remainingToday: freeAvailable ? usage.remainingArticles : 0,
      serverModel: getServerDefaultModel(),
    };
  })
  .post(
    "/test",
    async ({ headers, body }) => {
      const config: LlmRequestConfig = {
        apiKey: headers["x-llm-api-key"] || body?.apiKey,
        baseUrl: headers["x-llm-base-url"] || body?.baseUrl,
        model: headers["x-llm-model"] || body?.model,
        mode: "byok",
      };

      const result = await testLlmConnection(config);
      return result;
    },
    {
      body: t.Optional(
        t.Object({
          apiKey: t.Optional(t.String()),
          baseUrl: t.Optional(t.String()),
          model: t.Optional(t.String()),
        })
      ),
    }
  );
