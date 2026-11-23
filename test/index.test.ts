import { describe, expect, it } from "bun:test";
import { app } from "../src";

describe("Elysia Server Endpoints", () => {
  it("GET / returns status running", async () => {
    const response = await app.handle(new Request("http://localhost/"));
    expect(response.status).toBe(200);
    const data = (await response.json()) as { message: string; status: string };
    expect(data.status).toBe("running");
  });

  it("GET /health returns ok", async () => {
    const response = await app.handle(new Request("http://localhost/health"));
    expect(response.status).toBe(200);
    const data = (await response.json()) as { status: string; timestamp: string };
    expect(data.status).toBe("ok");
    expect(data.timestamp).toBeDefined();
  });
});
