import assert from "node:assert/strict";
import test from "node:test";
import { db } from "../lib/db";
import { comparePassword } from "../lib/auth";
import {
  ensureDefaultAdminOnStartup,
  provisionInitialAdmin,
} from "../lib/bootstrap/ensure-default-admin";

test("Bootstrap & Initial Admin Hardening Test Suite", async (t) => {
  const originalNodeEnv = process.env.NODE_ENV;
  const testSuffix = Date.now();

  t.after(async () => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  await t.test("1. Production fail-closed: ensureDefaultAdminOnStartup does not create static admin in production", async () => {
    process.env.NODE_ENV = "production";

    const preCount = await db.user.count({
      where: { email: "admin@profesionales.com" },
    });

    await ensureDefaultAdminOnStartup();

    const postCount = await db.user.count({
      where: { email: "admin@profesionales.com" },
    });

    assert.strictEqual(
      postCount,
      preCount,
      "In production, ensureDefaultAdminOnStartup must NOT create default admin with static password"
    );
  });

  await t.test("2. Idempotency when admin exists: ensureDefaultAdminOnStartup does nothing if admin already exists", async () => {
    process.env.NODE_ENV = "development";

    const adminCountBefore = await db.user.count({
      where: { role: { name: "ADMIN" } },
    });

    const defaultAdminCountBefore = await db.user.count({
      where: { email: "admin@profesionales.com" },
    });

    await ensureDefaultAdminOnStartup();

    const adminCountAfter = await db.user.count({
      where: { role: { name: "ADMIN" } },
    });

    const defaultAdminCountAfter = await db.user.count({
      where: { email: "admin@profesionales.com" },
    });

    assert.strictEqual(
      adminCountAfter,
      adminCountBefore,
      "Admin count must remain unchanged when an admin already exists"
    );

    assert.strictEqual(
      defaultAdminCountAfter,
      defaultAdminCountBefore,
      "Default admin with static credentials must not be created"
    );
  });

  await t.test("3. provisionInitialAdmin rejects missing or invalid inputs", async () => {
    // Missing email
    await assert.rejects(
      async () => {
        await provisionInitialAdmin({ email: "", password: "ValidPassword123!" });
      },
      /PROVISION_ERROR: Se requiere 'INITIAL_ADMIN_EMAIL'/
    );

    // Invalid email format
    await assert.rejects(
      async () => {
        await provisionInitialAdmin({ email: "invalid-email", password: "ValidPassword123!" });
      },
      /PROVISION_ERROR: El formato del email es inválido/
    );

    // Missing password
    await assert.rejects(
      async () => {
        await provisionInitialAdmin({ email: `test_${testSuffix}@example.com`, password: "" });
      },
      /PROVISION_ERROR: Se requiere 'INITIAL_ADMIN_PASSWORD'/
    );

    // Short password (< 8 chars)
    await assert.rejects(
      async () => {
        await provisionInitialAdmin({ email: `test_${testSuffix}@example.com`, password: "123" });
      },
      /PROVISION_ERROR: La contraseña debe tener al menos 8 caracteres/
    );
  });

  await t.test("4. provisionInitialAdmin creates admin securely with hashed password and is idempotent", async () => {
    const testAdminEmail = `admin_prov_${testSuffix}@test-institution.com`;
    const testPlainPassword = `SecureP@ssw0rd_${testSuffix}`;

    try {
      // 1. First execution creates admin
      const result1 = await provisionInitialAdmin({
        email: testAdminEmail,
        password: testPlainPassword,
        name: `Admin Test ${testSuffix}`,
      });

      assert.strictEqual(result1.success, true);
      assert.strictEqual(result1.alreadyExisted, false);
      assert.ok(result1.userId, "Must return created userId");

      // Verify user in DB
      const createdUser = await db.user.findUnique({
        where: { email: testAdminEmail },
        include: { role: true },
      });

      assert.ok(createdUser);
      assert.strictEqual(createdUser.email, testAdminEmail);
      assert.strictEqual(createdUser.role?.name, "ADMIN");

      // Verify password was hashed and plain password matches hash
      assert.notStrictEqual(createdUser.password, testPlainPassword);
      const isPasswordValid = await comparePassword(testPlainPassword, createdUser.password);
      assert.strictEqual(isPasswordValid, true, "Bcrypt hash must match the plain password");

      // 2. Second execution is idempotent (already exists)
      const result2 = await provisionInitialAdmin({
        email: testAdminEmail,
        password: "DifferentPassword123!",
        name: "Different Name",
      });

      assert.strictEqual(result2.success, true);
      assert.strictEqual(result2.alreadyExisted, true);
      assert.strictEqual(result2.userId, result1.userId);

      // Verify user in DB was NOT overwritten
      const checkUser = await db.user.findUnique({
        where: { email: testAdminEmail },
      });
      assert.strictEqual(checkUser?.password, createdUser.password, "Password must not be changed on duplicate call");
    } finally {
      // Cleanup isolated test user
      await db.user.deleteMany({ where: { email: testAdminEmail } });
    }
  });
});
