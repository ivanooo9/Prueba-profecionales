import type { Request as ExpressRequest } from "express";
import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { db } from "./db";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const IS_DEV = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;

if (!IS_DEV && (!JWT_SECRET || !JWT_REFRESH_SECRET)) {
  throw new Error("FATAL: JWT_SECRET y JWT_REFRESH_SECRET deben configurarse en variables de entorno para producción/staging!");
}

if (IS_DEV && (!JWT_SECRET || !JWT_REFRESH_SECRET)) {
  console.warn("⚠️ ADVERTENCIA DE SEGURIDAD: Usando claves JWT por defecto en entorno local. Configura JWT_SECRET en .env para mayor seguridad.");
}

const SECURE_JWT_SECRET = JWT_SECRET || "super-secret-key-professionals-ecuador-2026";
const SECURE_JWT_REFRESH_SECRET = JWT_REFRESH_SECRET || "super-secret-refresh-key-professionals-ecuador-2026";

export const AUTH_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  maxAge: AUTH_SESSION_MAX_AGE_MS,
} as const;

const SESSION_REVOCATION_REASON = {
  CONCURRENT_LIMIT: "CONCURRENT_SESSION_LIMIT",
  LOGOUT: "LOGOUT",
} as const;

interface AuthTokenPayload {
  userId: number;
  email: string;
  role: string;
  sessionId: string;
}

interface AuthSessionSubject {
  id: number;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, SECURE_JWT_SECRET, { expiresIn: "1d" });
}

export function generatePasswordResetToken(userId: number, email: string): string {
  return jwt.sign({ userId, email, type: "password_reset" }, SECURE_JWT_SECRET, { expiresIn: "30m" });
}

export function verifyPasswordResetToken(token: string): { userId: number; email: string } | null {
  try {
    const payload = jwt.verify(token, SECURE_JWT_SECRET) as any;
    if (payload && payload.type === "password_reset" && payload.userId && payload.email) {
      return { userId: payload.userId, email: payload.email };
    }
    return null;
  } catch (err) {
    return null;
  }
}

export function signRefreshToken(payload: { userId: number }): string {
  return jwt.sign(payload, SECURE_JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    const payload = jwt.verify(token, SECURE_JWT_SECRET) as Partial<AuthTokenPayload>;
    if (
      typeof payload.userId !== "number" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.sessionId !== "string" ||
      payload.sessionId.length === 0
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
    };
  } catch (error) {
    return null;
  }
}

export function verifyRefreshToken(token: string) {
  try {
    return jwt.verify(token, SECURE_JWT_REFRESH_SECRET) as { userId: number };
  } catch (error) {
    return null;
  }
}

function getRequestIp(req?: ExpressRequest): string | null {
  if (!req) {
    return null;
  }

  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  if (Array.isArray(forwardedFor) && forwardedFor[0]) {
    return forwardedFor[0].split(",")[0]?.trim() || null;
  }

  return req.ip || req.socket.remoteAddress || null;
}

async function lockUserSessions(tx: Prisma.TransactionClient, userId: number): Promise<void> {
  // prisma/schema.prisma currently uses provider = "postgresql". PostgreSQL advisory
  // transaction locks serialize concurrent logins per user while this transaction creates
  // the new session and trims older active rows.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${userId})`;
}

export async function createAuthSession(
  user: AuthSessionSubject,
  role: string,
  req?: ExpressRequest
): Promise<string> {
  const tokenId = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + AUTH_SESSION_MAX_AGE_MS);
  const userAgent = req?.headers["user-agent"] || null;
  const ipAddress = getRequestIp(req);

  const executeCreateSession = async () => {
    await db.$transaction(async (tx) => {
      await lockUserSessions(tx, user.id);

      await tx.userSession.create({
        data: {
          userId: user.id,
          tokenId,
          expiresAt,
          userAgent: typeof userAgent === "string" ? userAgent : null,
          ipAddress,
        },
      });

      const activeSessions = await tx.userSession.findMany({
        where: {
          userId: user.id,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { id: true },
      });

      const sessionsToRevoke = activeSessions.slice(2).map((session) => session.id);
      if (sessionsToRevoke.length > 0) {
        await tx.userSession.updateMany({
          where: {
            id: { in: sessionsToRevoke },
            revokedAt: null,
          },
          data: {
            revokedAt: now,
            revocationReason: SESSION_REVOCATION_REASON.CONCURRENT_LIMIT,
          },
        });
      }
    });
  };

  try {
    await executeCreateSession();
  } catch (err: any) {
    if (err?.code === "P2002" || err?.message?.includes("UserSession")) {
      console.warn("[Auth] Resyncing UserSession_id_seq sequence due to ID conflict...");
      await db.$queryRawUnsafe(`
        SELECT setval(pg_get_serial_sequence('"UserSession"', 'id'), COALESCE((SELECT MAX(id) FROM "UserSession"), 0) + 10, true)
      `).catch(() => {});

      await executeCreateSession();
    } else {
      throw err;
    }
  }

  return signToken({
    userId: user.id,
    email: user.email,
    role,
    sessionId: tokenId,
  });
}

export async function validateSessionToken(token: string) {
  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  const session = await db.userSession.findUnique({
    where: { tokenId: payload.sessionId },
    include: {
      user: {
        include: {
          role: true,
          professionalProfile: true,
          referralProfile: true,
        },
      },
    },
  });

  const now = new Date();
  if (
    !session ||
    session.userId !== payload.userId ||
    session.revokedAt ||
    session.expiresAt <= now ||
    session.user.status !== "ACTIVE"
  ) {
    return null;
  }

  await db.userSession.update({
    where: { id: session.id },
    data: { lastSeenAt: now },
  });

  return session.user;
}

export async function revokeSessionFromToken(token: string | undefined): Promise<boolean> {
  if (!token) {
    return false;
  }

  const payload = verifyToken(token);
  if (!payload) {
    return false;
  }

  const result = await db.userSession.updateMany({
    where: {
      tokenId: payload.sessionId,
      userId: payload.userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      revocationReason: SESSION_REVOCATION_REASON.LOGOUT,
    },
  });

  return result.count > 0;
}

/**
 * Extracts and verifies the user session from the Authorization header of a Next.js API request.
 */
export async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return null;
  }

  return validateSessionToken(token);
}
