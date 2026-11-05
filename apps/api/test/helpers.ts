import { StorageService } from "../src/storage/storage.service";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/bootstrap";
import { PrismaService } from "../src/common/prisma.service";
import { loadEnv } from "../src/config/env";

export interface TestContext {
  app: INestApplication;
  http: ReturnType<typeof request>;
  prisma: PrismaService;
  storage: StorageService;
}

export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app, loadEnv());
  await app.init();
  return { app, http: request(app.getHttpServer()), prisma: app.get(PrismaService), storage: app.get(StorageService) };
}

let counter = 0;
export function uniqueEmail(prefix = "user") {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@test.example`;
}

export async function registerUser(ctx: TestContext, name = "Test User") {
  const email = uniqueEmail();
  const res = await ctx.http.post("/api/v1/auth/register").send({ name, email, password: "correct-horse-battery" });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.data.token as string, id: res.body.data.user.id as string, email };
}

export async function loginDemo(ctx: TestContext, who: "admin" | "provider" | "user") {
  const res = await ctx.http.post("/api/v1/auth/login").send({ email: `${who}@desiconnect.example`, password: "DemoPass123!" });
  if (res.status !== 200) throw new Error(`demo login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.data.token as string, id: res.body.data.user.id as string };
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export function eventPayload(overrides: Record<string, unknown> = {}) {
  return {
    categorySlug: "festivals",
    title: "Test Community Ugadi Celebration",
    description: "A community Ugadi celebration with food, music and cultural programs for families.",
    city: "Plano",
    state: "TX",
    languages: ["Telugu", "English"],
    event: { startAt: new Date(Date.now() + 10 * 86_400_000).toISOString(), venue: "Test Hall", isFree: true, capacity: 2 },
    ...overrides,
  };
}
