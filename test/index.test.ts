import { describe, expect, it } from "bun:test";
import { app } from "../src";

describe("Server Core Endpoints", () => {
  it("GET / returns dashboard HTML", async () => {
    const response = await app.handle(new Request("http://localhost/"));
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("GET /health returns status ok", async () => {
    const response = await app.handle(new Request("http://localhost/health"));
    expect(response.status).toBe(200);
    const data = (await response.json()) as { status: string; timestamp: string };
    expect(data.status).toBe("ok");
    expect(data.timestamp).toBeDefined();
  });
});
