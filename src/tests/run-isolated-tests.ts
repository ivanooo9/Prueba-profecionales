import { execSync } from "node:child_process";
import fs from "node:fs";

function run() {
  const envContent = fs.readFileSync(".env", "utf8");
  const testDbMatch = envContent.match(/TEST_DATABASE_URL=['"]?([^'"\n]+)['"]?/);
  
  if (!testDbMatch || !testDbMatch[1]) {
    console.error("ERROR: TEST_DATABASE_URL no está configurada en .env.");
    process.exit(1);
  }

  const testDbUrl = testDbMatch[1];
  const urlObj = new URL(testDbUrl);

  if (urlObj.pathname === "/profesionales_ecuador" || !urlObj.pathname.includes("test")) {
    console.error(`ERROR DE SEGURIDAD: TEST_DATABASE_URL apunta a '${urlObj.pathname}'. Abortando.`);
    process.exit(1);
  }

  console.log(`[Isolated Test Runner] Ejecutando suite sobre: ${urlObj.pathname} (Host: ${urlObj.hostname})`);

  try {
    console.log("[Isolated Test Runner] Ejecutando: academic-isolated-flow.test.ts");
    execSync("npx tsx --test --test-concurrency=1 src/tests/academic-isolated-flow.test.ts", {
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: "inherit",
    });

    console.log("[Isolated Test Runner] Ejecutando: academic-attendance-phase11.test.ts");
    execSync("npx tsx --test --test-concurrency=1 src/tests/academic-attendance-phase11.test.ts", {
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: "inherit",
    });

    console.log("[Isolated Test Runner] Ejecutando: academic-schedule-phase11-2.test.ts");
    execSync("npx tsx --test --test-concurrency=1 src/tests/academic-schedule-phase11-2.test.ts", {
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: "inherit",
    });

    console.log("[Isolated Test Runner] Ejecutando: academic-subject-schedule-phase11-3.test.ts");
    execSync("npx tsx --test --test-concurrency=1 src/tests/academic-subject-schedule-phase11-3.test.ts", {
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: "inherit",
    });

    console.log("[Isolated Test Runner] Ejecutando: academic-unmigrated-fallback.test.ts");
    execSync("npx tsx --test --test-concurrency=1 src/tests/academic-unmigrated-fallback.test.ts", {
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: "inherit",
    });

    console.log("[Isolated Test Runner] Ejecutando: academic-phase14-activities.test.ts");
    execSync("npx tsx --test --test-concurrency=1 src/tests/academic-phase14-activities.test.ts", {
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: "inherit",
    });

    console.log("[Isolated Test Runner] Todas las pruebas aisladas concluyeron con éxito (PASS).");
  } catch (error: any) {
    console.error("[Isolated Test Runner] Falló la ejecución de las pruebas aisladas.");
    process.exit(error.status || 1);
  }
}

run();
