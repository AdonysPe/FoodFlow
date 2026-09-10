import { resolveAny } from "node:dns/promises";
import { describe, expect, test } from "vitest";

const baseUrl = process.env.SMOKE_BASE_URL?.replace(/\/$/, "");
const wildcardHost = process.env.SMOKE_WILDCARD_HOST
  ?.replace(/^https?:\/\//, "")
  .replace(/\/$/, "");

async function get(path: string) {
  if (!baseUrl) throw new Error("SMOKE_BASE_URL no está configurado");
  return fetch(`${baseUrl}${path}`, {
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
}

describe("pre-launch smoke", () => {
  test.skipIf(!baseUrl)("homepage carga sin errores", async () => {
    const response = await get("/");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
  });

  test.skipIf(!baseUrl)("/calculadora responde 200", async () => {
    expect((await get("/calculadora")).status).toBe(200);
  });

  test.skipIf(!baseUrl)("/libro-de-reclamaciones responde 200", async () => {
    expect((await get("/libro-de-reclamaciones")).status).toBe(200);
  });

  test.skipIf(!baseUrl)("/api/health responde OK", async () => {
    const response = await get("/api/health");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "ok" });
  });

  test.skipIf(!wildcardHost)("subdominio wildcard resuelve correctamente", async () => {
    if (!wildcardHost) throw new Error("SMOKE_WILDCARD_HOST no está configurado");
    const records = await resolveAny(wildcardHost);
    expect(records.length).toBeGreaterThan(0);

    const response = await fetch(`https://${wildcardHost}/`, {
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    expect(response.status).toBe(200);
    expect(response.url).toContain(wildcardHost);
  });
});
