import "./load-env";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { buildOpenApi, configureApp } from "./bootstrap";
import { loadEnv } from "./config/env";

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  configureApp(app, env);
  SwaggerModule.setup("api/docs", app, buildOpenApi(app), { jsonDocumentUrl: "api/docs/openapi.json" });
  await app.listen(env.API_PORT, "0.0.0.0");
  app.get(Logger).log(`DesiConnect API listening on :${env.API_PORT} (docs at /api/docs)`);
}

void bootstrap();
