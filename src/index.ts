import { Elysia } from "elysia";
import { healthRoutes } from "./routes/health";

const port = Number(process.env.PORT) || 3000;

export const app = new Elysia()
  .get("/", () => ({
    message: "Welcome to Artikel SEO Automation API",
    status: "running",
  }))
  .use(healthRoutes)
  .listen(port);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
