import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { createCorsMiddleware, getAllowedFrontendOrigins, isAllowedRequestOrigin } from "../lib/cors";

test("frontend allowlist matches exact normalized origins only", () => {
  const origins = getAllowedFrontendOrigins({
    FRONTEND_URL: "https://prueba-profecionales.vercel.app/",
    FRONTEND_URLS: "https://admin.example.com, https://portal.example.com",
  } as NodeJS.ProcessEnv);

  assert.deepEqual([...origins], [
    "https://prueba-profecionales.vercel.app",
    "https://admin.example.com",
    "https://portal.example.com",
  ]);
  assert.equal(origins.has("https://attacker.vercel.app"), false);
  assert.throws(() => getAllowedFrontendOrigins({
    FRONTEND_URL: "https://example.com/path",
  } as NodeJS.ProcessEnv));
});

test("same-origin requests are accepted without widening the cross-origin allowlist", () => {
  const origins = new Set<string>();

  assert.equal(isAllowedRequestOrigin("http://localhost:3000", origins, "http", "localhost:3000"), true);
  assert.equal(isAllowedRequestOrigin("http://localhost:5173", origins, "http", "localhost:3000"), false);
});

test("allowed preflight returns credentialed headers and rejects unlisted origins", () => {
  const middleware = createCorsMiddleware(new Set(["https://frontend.example.com"]));
  const headers = new Map<string, string>();
  let statusCode = 200;
  let responseBody: unknown;

  const request = {
    method: "OPTIONS",
    protocol: "https",
    get(name: string) {
      const values: Record<string, string> = {
        origin: "https://frontend.example.com",
        host: "api.example.com",
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type",
      };
      return values[name.toLowerCase()];
    },
  } as Request;
  const response = {
    vary(name: string) {
      headers.set("vary", name);
      return this;
    },
    setHeader(name: string, value: string) {
      headers.set(name.toLowerCase(), value);
      return this;
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    end() {},
    json(body: unknown) {
      responseBody = body;
      return this;
    },
  } as unknown as Response;

  middleware(request, response, () => assert.fail("Allowed preflight must terminate"));
  assert.equal(statusCode, 204);
  assert.equal(headers.get("access-control-allow-origin"), "https://frontend.example.com");
  assert.equal(headers.get("access-control-allow-credentials"), "true");

  const deniedRequest = {
    ...request,
    get(name: string) {
      if (name.toLowerCase() === "origin") return "https://attacker.example.com";
      return request.get(name);
    },
  } as Request;
  headers.clear();
  statusCode = 200;
  middleware(deniedRequest, response, () => assert.fail("Denied preflight must terminate"));
  assert.equal(statusCode, 403);
  assert.equal(headers.has("access-control-allow-origin"), false);
  assert.deepEqual(responseBody, { success: false, error: "Origen no permitido." });
});