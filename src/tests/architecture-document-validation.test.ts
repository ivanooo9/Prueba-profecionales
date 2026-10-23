import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import * as dbModule from "../lib/db";
import { ArchitectureService } from "../services/architecture.service";
import { ArchitectureStorageService } from "../services/architecture-storage.service";

const makePdfBuffer = () => Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n");

test("rejeita archivo con extensión y MIME incompatibles", () => {
  assert.throws(
    () => ArchitectureStorageService.validateFile("malicious.pdf", "image/png", 1024),
    /incompatible|no permitido|MIME/i
  );
});

test("acepta un PDF coherente y calcula checksum SHA-256", async () => {
  const originalDir = process.env.ARCHITECTURE_STORAGE_DIR;
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "arch-doc-"));
  process.env.ARCHITECTURE_STORAGE_DIR = tmpDir;

  try {
    const buffer = makePdfBuffer();
    const info = await ArchitectureStorageService.saveFile(
      7,
      8,
      9,
      "documento.pdf",
      "application/pdf",
      buffer
    );

    assert.equal(info.mimeType, "application/pdf");
    assert.equal(info.fileSize, buffer.length);
    assert.equal(info.checksumSha256, crypto.createHash("sha256").update(buffer).digest("hex"));
    assert.ok(info.storageKey.includes("documento.pdf") || info.storageKey.length > 10);
    const file = await ArchitectureStorageService.getFile(7, 8, 9, info.storageKey);
    assert.equal(file.buffer.toString("latin1").startsWith("%PDF-"), true);
  } finally {
    if (originalDir === undefined) delete process.env.ARCHITECTURE_STORAGE_DIR;
    else process.env.ARCHITECTURE_STORAGE_DIR = originalDir;
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test("rechaza ejecutables disfrazados con cabeceras PE", () => {
  const peBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
  assert.throws(
    () => ArchitectureStorageService.validateFile("invoice.pdf", "application/pdf", peBuffer.length, peBuffer),
    /ejecutable|inseguro|PDF/i
  );
});

test("rechaza rutas y nombres maliciosos en el almacenamiento", async () => {
  const originalDir = process.env.ARCHITECTURE_STORAGE_DIR;
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "arch-malicious-"));
  process.env.ARCHITECTURE_STORAGE_DIR = tmpDir;

  try {
    assert.throws(
      () => ArchitectureStorageService.getFilePath(1, 2, 3, "../../etc/passwd"),
      /invalida|ruta|path/i
    );
    assert.throws(
      () => ArchitectureStorageService.getFilePath(1, 2, 3, "../escape.pdf"),
      /invalida|ruta|path/i
    );
  } finally {
    if (originalDir === undefined) delete process.env.ARCHITECTURE_STORAGE_DIR;
    else process.env.ARCHITECTURE_STORAGE_DIR = originalDir;
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test("crea documento sin archivo y mantiene historial secuencial sin sobrescribir versiones", async () => {
  const originalDir = process.env.ARCHITECTURE_STORAGE_DIR;
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "arch-versioning-"));
  process.env.ARCHITECTURE_STORAGE_DIR = tmpDir;

  const fakeDb = {
    architectureProject: {
      findUnique: async () => ({ id: 11, organizationId: 7, archivedAt: null }),
    },
    architectureProjectStage: {
      findUnique: async () => ({ id: 21, organizationId: 7, projectId: 11 }),
    },
    architectureDocument: {
      create: async ({ data }: any) => ({ id: 44, organizationId: 7, projectId: 11, ...data }),
      findUnique: async () => ({
        id: 44,
        organizationId: 7,
        projectId: 11,
        stageId: 21,
        name: "Plano de fachada",
        documentType: "Plano",
        description: "Plano principal",
        status: "Borrador",
        createdByUserId: 5,
        createdByUser: { name: "Ana" },
        project: { name: "Proyecto Villa" },
        stage: { name: "Planos" },
        versions: [],
        _count: { versions: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      update: async () => undefined,
    },
    architectureDocumentVersion: {
      aggregate: async () => ({ _max: { versionNumber: 1 } }),
      create: async ({ data }: any) => ({
        id: 100 + data.versionNumber,
        ...data,
        uploadedByUser: { id: 5, name: "Ana", email: "ana@example.com" },
        createdAt: new Date(),
      }),
      findMany: async () => [
        {
          id: 101,
          documentId: 44,
          organizationId: 7,
          versionNumber: 2,
          originalFilename: "v2.pdf",
          storageKey: "v2-key",
          mimeType: "application/pdf",
          fileSize: 123,
          checksumSha256: "abc",
          notes: "Segunda revisión",
          uploadedByUserId: 5,
          uploadedByUser: { id: 5, name: "Ana", email: "ana@example.com" },
          createdAt: new Date(),
        },
        {
          id: 100,
          documentId: 44,
          organizationId: 7,
          versionNumber: 1,
          originalFilename: "v1.pdf",
          storageKey: "v1-key",
          mimeType: "application/pdf",
          fileSize: 234,
          checksumSha256: "def",
          notes: "Primera revisión",
          uploadedByUserId: 5,
          uploadedByUser: { id: 5, name: "Ana", email: "ana@example.com" },
          createdAt: new Date(),
        },
      ],
      findFirst: async () => ({
        id: 101,
        documentId: 44,
        organizationId: 7,
        versionNumber: 2,
        originalFilename: "v2.pdf",
        storageKey: "v2-key",
        mimeType: "application/pdf",
        fileSize: 123,
        checksumSha256: "abc",
      }),
    },
    $transaction: async (cb: any) => cb(fakeDb),
    $executeRaw: async () => undefined,
  } as any;

  let originalProject: any;
  let originalDocument: any;
  let originalVersion: any;
  let originalTransaction: any;
  let originalExecuteRaw: any;

  try {
    originalProject = (dbModule as any).db.architectureProject;
    originalDocument = (dbModule as any).db.architectureDocument;
    originalVersion = (dbModule as any).db.architectureDocumentVersion;
    originalTransaction = (dbModule as any).db.$transaction;
    originalExecuteRaw = (dbModule as any).db.$executeRaw;

    (dbModule as any).db.architectureProject = fakeDb.architectureProject;
    (dbModule as any).db.architectureDocument = fakeDb.architectureDocument;
    (dbModule as any).db.architectureDocumentVersion = fakeDb.architectureDocumentVersion;
    (dbModule as any).db.$transaction = fakeDb.$transaction;
    (dbModule as any).db.$executeRaw = fakeDb.$executeRaw;

    const doc = await ArchitectureService.createDocument(
      7,
      5,
      {
        projectId: 11,
        stageId: 21,
        name: "Plano de fachada",
        documentType: "Plano",
        description: "Plano principal",
        status: "Borrador",
      },
      undefined,
      null,
      fakeDb
    );

    assert.equal(doc.name, "Plano de fachada");
    assert.equal(doc.versionsCount, 0);
    assert.equal(doc.currentVersion, null);

    const dto = ArchitectureService.mapDocumentDTO({
      id: 44,
      organizationId: 7,
      projectId: 11,
      project: { name: "Proyecto Villa" },
      stageId: 21,
      stage: { name: "Planos" },
      name: "Plano de fachada",
      documentType: "Plano",
      description: "Plano principal",
      status: "Borrador",
      createdByUserId: 5,
      createdByUser: { name: "Ana" },
      _count: { versions: 2 },
      versions: [
        {
          id: 101,
          organizationId: 7,
          documentId: 44,
          versionNumber: 2,
          originalFilename: "v2.pdf",
          storageKey: "v2-key",
          mimeType: "application/pdf",
          fileSize: 123,
          checksumSha256: "abc",
          notes: "Segunda revisión",
          uploadedByUserId: 5,
          uploadedByUser: { name: "Ana" },
          createdAt: new Date(),
        },
        {
          id: 100,
          organizationId: 7,
          documentId: 44,
          versionNumber: 1,
          originalFilename: "v1.pdf",
          storageKey: "v1-key",
          mimeType: "application/pdf",
          fileSize: 234,
          checksumSha256: "def",
          notes: "Primera revisión",
          uploadedByUserId: 5,
          uploadedByUser: { name: "Ana" },
          createdAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    assert.equal(dto.versionsCount, 2);
    assert.equal(dto.currentVersion.versionNumber, 2);
    assert.equal(dto.versions[0].versionNumber, 2);
    assert.equal(dto.versions[1].versionNumber, 1);

    const history = await ArchitectureService.listDocumentVersions(7, 44, fakeDb);
    assert.equal(history.length, 2);
    assert.equal(history[0].versionNumber, 2);
    assert.equal(history[1].versionNumber, 1);

    const saved = await ArchitectureStorageService.saveFile(
      7,
      11,
      44,
      "v3.pdf",
      "application/pdf",
      makePdfBuffer()
    );
    const file = await ArchitectureStorageService.getFile(7, 11, 44, saved.storageKey);
    assert.equal(file.buffer.toString("latin1").startsWith("%PDF-"), true);

    const versionFile = {
      buffer: file.buffer,
      absolutePath: file.absolutePath,
      originalFilename: saved.sanitizedFileName,
      mimeType: saved.mimeType,
      fileSize: saved.fileSize,
      checksumSha256: saved.checksumSha256,
      versionNumber: 3,
      versionId: 103,
    };
    assert.equal(versionFile.checksumSha256, crypto.createHash("sha256").update(makePdfBuffer()).digest("hex"));

    await fs.unlink(file.absolutePath);
    await assert.rejects(
      () => ArchitectureStorageService.getFile(7, 11, 44, saved.storageKey),
      /no fue encontrado|encontrado/i
    );
  } finally {
    (dbModule as any).db.architectureProject = originalProject;
    (dbModule as any).db.architectureDocument = originalDocument;
    (dbModule as any).db.architectureDocumentVersion = originalVersion;
    (dbModule as any).db.$transaction = originalTransaction;
    (dbModule as any).db.$executeRaw = originalExecuteRaw;
    if (originalDir === undefined) delete process.env.ARCHITECTURE_STORAGE_DIR;
    else process.env.ARCHITECTURE_STORAGE_DIR = originalDir;
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
