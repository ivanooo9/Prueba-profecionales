import assert from "node:assert/strict";
import test from "node:test";
import { db } from "../lib/db";
import {
  createAuthSession,
  hashPassword,
  revokeSessionFromToken,
  validateSessionToken,
  verifyToken,
} from "../lib/auth";

const TEST_ROLE = {
  CLIENT: "CLIENT",
} as const;

test(
  "auth sessions keep the newest two sessions and reject revoked, expired, missing, or logged-out sessions",
  { skip: !process.env.DATABASE_URL ? "DATABASE_URL is required for Prisma auth-session integration tests" : false },
  async (t) => {
    try {
      await db.$queryRaw`SELECT 1`;
    } catch (error) {
      t.skip("Prisma database is not reachable; start DATABASE_URL before running auth-session integration tests");
      await db.$disconnect();
      return;
    }

    const email = `auth-session-${Date.now()}@example.test`;

    await db.user.deleteMany({ where: { email } });

    const role = await db.role.upsert({
      where: { name: TEST_ROLE.CLIENT },
      update: {},
      create: { name: TEST_ROLE.CLIENT, description: "Cliente o Paciente" },
    });

    const user = await db.user.create({
      data: {
        name: "Auth Session Test",
        email,
        password: await hashPassword("secret123"),
        roleId: role.id,
        status: "ACTIVE",
      },
      include: { role: true },
    });

    try {
      const tokenA = await createAuthSession(user, user.role.name);
      const tokenB = await createAuthSession(user, user.role.name);

      assert.ok(await validateSessionToken(tokenA));
      assert.ok(await validateSessionToken(tokenB));

      const tokenC = await createAuthSession(user, user.role.name);
      assert.equal(await validateSessionToken(tokenA), null);
      assert.ok(await validateSessionToken(tokenB));
      assert.ok(await validateSessionToken(tokenC));

      const tokenD = await createAuthSession(user, user.role.name);
      assert.equal(await validateSessionToken(tokenB), null);
      assert.ok(await validateSessionToken(tokenC));
      assert.ok(await validateSessionToken(tokenD));

      const tokenExpired = await createAuthSession(user, user.role.name);
      const expiredPayload = verifyToken(tokenExpired);
      assert.ok(expiredPayload);
      await db.userSession.update({
        where: { tokenId: expiredPayload.sessionId },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      assert.equal(await validateSessionToken(tokenExpired), null);

      const tokenMissing = await createAuthSession(user, user.role.name);
      const missingPayload = verifyToken(tokenMissing);
      assert.ok(missingPayload);
      await db.userSession.delete({ where: { tokenId: missingPayload.sessionId } });
      assert.equal(await validateSessionToken(tokenMissing), null);

      const tokenLogout = await createAuthSession(user, user.role.name);
      const tokenOther = await createAuthSession(user, user.role.name);
      assert.equal(await revokeSessionFromToken(tokenLogout), true);
      assert.equal(await validateSessionToken(tokenLogout), null);
      assert.ok(await validateSessionToken(tokenOther));

      const activeCount = await db.userSession.count({
        where: {
          userId: user.id,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      assert.ok(activeCount <= 2);
    } finally {
      await db.user.deleteMany({ where: { email } });
      await db.$disconnect();
    }
  }
);
