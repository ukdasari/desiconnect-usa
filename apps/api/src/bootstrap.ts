import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from "@nestjs/swagger";
import helmet from "helmet";
import type { Env } from "./config/env";

export const API_PREFIX = "api/v1";

/** Shared HTTP setup for main.ts and the e2e tests. */
export function configureApp(app: INestApplication, env: Env): void {
  app.setGlobalPrefix(API_PREFIX);
  app.use(helmet());
  app.enableCors({
    origin: env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean),
    credentials: true,
    exposedHeaders: ["x-request-id"],
  });
  app.enableShutdownHooks();
}

export function buildOpenApi(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle("DesiConnect USA API")
    .setDescription(
      "REST API for the DesiConnect USA marketplace. All responses use the envelope `{ data, meta?, traceId }`; " +
        "errors use `{ error: { code, message, details? }, traceId }`.",
    )
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, config);
}
