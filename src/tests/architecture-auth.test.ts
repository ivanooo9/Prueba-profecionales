import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { getArchitectureUserId } from "../controllers/architecture-auth";

function createRequest(user: unknown): Request {
  return { user } as unknown as Request;
}

function createResponse(localUser?: unknown) {
  const result = { statusCode: 200, body: undefined as unknown };
  const response = {
    locals: { user: localUser },
    status(code: number) {
      result.statusCode = code;
      return this;
    },
    json(body: unknown) {
      result.body = body;
      return this;
    },
  } as unknown as Response;
  return { response, result };
}

test("authenticated request uses the real user ID", () => {
  const { response, result } = createResponse();
  const userId = getArchitectureUserId(createRequest({ id: 42 }), response);

  assert.equal(userId, 42);
  assert.equal(result.statusCode, 200);
  assert.equal(result.body, undefined);
});

test("valid res.locals user context remains supported", () => {
  const { response, result } = createResponse({ id: 73 });
  const userId = getArchitectureUserId(createRequest(null), response);

  assert.equal(userId, 73);
  assert.equal(result.statusCode, 200);
});

test("missing user ID returns 401 and no default ID", () => {
  const { response, result } = createResponse();
  const userId = getArchitectureUserId(createRequest({}), response);

  assert.equal(userId, null);
  assert.equal(result.statusCode, 401);
  assert.deepEqual(result.body, {
    success: false,
    error: "No autenticado. No se pudo identificar al usuario responsable.",
  });
  assert.notEqual(userId, 1);
});

test("incomplete context and nonnumeric IDs are rejected", () => {
  for (const user of [null, undefined, {}, { id: "1" }, { id: 0 }, { id: -2 }, { id: 1.5 }]) {
    const { response, result } = createResponse();
    const userId = getArchitectureUserId(createRequest(user), response);
    assert.equal(userId, null);
    assert.equal(result.statusCode, 401);
  }
});

test("an actual authenticated user with ID 1 is not rewritten", () => {
  const { response } = createResponse();
  assert.equal(getArchitectureUserId(createRequest({ id: 1 }), response), 1);
});