import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { handleArchitectureError } from "../controllers/architecture-error";

describe("ARQ-015 — Clasificador Centralizado de Errores HTTP", () => {
  const createMockResponse = () => {
    let capturedStatus: number = 200;
    let capturedBody: any = null;

    const res: any = {
      status: (code: number) => {
        capturedStatus = code;
        return res;
      },
      json: (data: any) => {
        capturedBody = data;
        return res;
      },
      getStatus: () => capturedStatus,
      getBody: () => capturedBody,
    };
    return res;
  };

  test("1. Mapeo HTTP 400: Error de validación y reglas de negocio", () => {
    const res = createMockResponse();
    const error = new Error("El nombre del proyecto es obligatorio y no puede estar vacío.");

    handleArchitectureError(res, error, "Error por defecto");

    assert.equal(res.getStatus(), 400);
    assert.equal(res.getBody().success, false);
    assert.match(res.getBody().error, /obligatorio/i);
  });

  test("2. Mapeo HTTP 400: Rechazo por cliente inactivo", () => {
    const res = createMockResponse();
    const error = new Error("No se pueden crear proyectos asociados a un cliente inactivo.");

    handleArchitectureError(res, error, "Error por defecto");

    assert.equal(res.getStatus(), 400);
    assert.equal(res.getBody().success, false);
    assert.match(res.getBody().error, /inactivo/i);
  });

  test("3. Mapeo HTTP 401: Usuario no autenticado", () => {
    const res = createMockResponse();
    const error = new Error("No autenticado. Token o credenciales expiradas.");

    handleArchitectureError(res, error, "Error por defecto");

    assert.equal(res.getStatus(), 401);
    assert.equal(res.getBody().success, false);
    assert.match(res.getBody().error, /no autenticado/i);
  });

  test("4. Mapeo HTTP 403: Acceso denegado o prohibido", () => {
    const res = createMockResponse();
    const error = new Error("Acceso prohibido: usuario no autorizado para modificar este recurso.");

    handleArchitectureError(res, error, "Error por defecto");

    assert.equal(res.getStatus(), 403);
    assert.equal(res.getBody().success, false);
    assert.match(res.getBody().error, /prohibido/i);
  });

  test("5. Mapeo HTTP 404: Recurso no encontrado o no existente", () => {
    const res = createMockResponse();
    const error = new Error("Proyecto con ID 404 no encontrado en la organización.");

    handleArchitectureError(res, error, "Error por defecto");

    assert.equal(res.getStatus(), 404);
    assert.equal(res.getBody().success, false);
    assert.match(res.getBody().error, /no encontrado/i);
  });

  test("6. Mapeo HTTP 409: Conflicto o clave duplicada", () => {
    const res = createMockResponse();
    const error = new Error("Ya existe un proyecto con el código PRJ-ARQ-2026-0001.");

    handleArchitectureError(res, error, "Error por defecto");

    assert.equal(res.getStatus(), 409);
    assert.equal(res.getBody().success, false);
    assert.match(res.getBody().error, /ya existe/i);
  });

  test("7. Mapeo HTTP 500: Error interno sanitizado protegiendo llamadas Prisma", () => {
    const res = createMockResponse();
    const prismaError = new Error(
      "Invalid `prisma.architectureProject.findMany()` invocation: database host connection refused at /var/app/backend/db.ts:124"
    );
    (prismaError as any).code = "P2000";

    handleArchitectureError(res, prismaError, "Error interno del servidor en el módulo de arquitectura.");

    assert.equal(res.getStatus(), 500);
    assert.equal(res.getBody().success, false);
    // Verificar que no expone internals de prisma ni rutas de servidor
    assert.equal(res.getBody().error, "Error interno del servidor en el módulo de arquitectura.");
    assert.ok(!res.getBody().error.includes("prisma"));
    assert.ok(!res.getBody().error.includes("/var/app/backend"));
  });
});
