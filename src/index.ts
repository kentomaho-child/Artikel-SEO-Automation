import { Elysia } from "elysia";
import { articleRoutes } from "./routes/articles";
import { healthRoutes } from "./routes/health";
import { llmRoutes } from "./routes/llm";
import { presetRoutes } from "./routes/presets";

export const app = new Elysia()
  // Mount routes
  .use(healthRoutes)
  .use(llmRoutes)
  .use(presetRoutes)
  .use(articleRoutes)

  // Serve static files from public directory
  .get("/", () => Bun.file("public/index.html"))
  .get("/styles.css", ({ set }) => {
    set.headers["Content-Type"] = "text/css; charset=utf-8";
    return Bun.file("public/styles.css");
  })
  .get("/app.js", ({ set }) => {
    set.headers["Content-Type"] = "application/javascript; charset=utf-8";
    return Bun.file("public/app.js");
  });

const port = Number(process.env.PORT) || 3000;

if (import.meta.main) {
  app.listen(port);
  console.log(
    `🦊 Elysia is running at http://${app.server?.hostname || "localhost"}:${app.server?.port || port}`
  );
}

export type App = typeof app;
