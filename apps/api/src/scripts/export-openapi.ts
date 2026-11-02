/* Writes the OpenAPI document to docs/api/openapi.json. Run after `pnpm build`: pnpm --filter @desiconnect/api openapi */
import "../load-env";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { AppModule } from "../app.module";
import { buildOpenApi, configureApp } from "../bootstrap";
import { loadEnv } from "../config/env";

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  configureApp(app, loadEnv());
  const doc = buildOpenApi(app);
  const out = path.resolve(__dirname, "../../../../docs/api/openapi.json");
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(doc, null, 2));
  await app.close();
  process.stdout.write(`Wrote ${Object.keys(doc.paths).length} paths to ${out}\n`);
}

void main();
