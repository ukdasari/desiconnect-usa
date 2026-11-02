// Creates (or resets) the test database, applies migrations and seeds reference + demo data.
import { execSync } from "node:child_process";
import path from "node:path";
import { createPrismaClient } from "@desiconnect/database";

export default async function globalSetup() {
  await import("./env");
  const url = new URL(process.env.DATABASE_URL!);
  const dbName = url.pathname.slice(1);
  if (!/^[a-z0-9_]+_test$/.test(dbName)) throw new Error(`Refusing to reset non-test database "${dbName}"`);
  const adminUrl = new URL(url.toString());
  adminUrl.pathname = "/postgres";

  const admin = createPrismaClient({ databaseUrl: adminUrl.toString() });
  await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
  await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
  await admin.$disconnect();

  const dbPkg = path.resolve(__dirname, "../../../packages/database");
  const env = { ...process.env, SEED_DEMO: "true" };
  execSync("npx prisma migrate deploy", { cwd: dbPkg, env, stdio: "pipe" });
  execSync("npx tsx prisma/seed/index.ts", { cwd: dbPkg, env, stdio: "pipe" });
}
