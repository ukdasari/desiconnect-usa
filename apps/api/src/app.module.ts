import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { ClientThrottlerGuard } from "./common/client-throttler.guard";
import { LoggerModule } from "nestjs-pino";
import { randomUUID } from "node:crypto";
import { AiModule } from "./ai/ai.controller";
import { AuditModule } from "./audit/audit.service";
import { AuthModule } from "./auth/auth.module";
import { CategoriesModule } from "./categories/categories.controller";
import { EnvelopeInterceptor, GlobalExceptionFilter } from "./common/envelope";
import { PrismaModule } from "./common/prisma.service";
import { ConfigModule } from "./config/config.module";
import { loadEnv } from "./config/env";
import { HealthController } from "./health/health.controller";
import { AdminModule, EngagementModule, ListingsModule, ProvidersModule, UsersModule } from "./modules";
import { NotificationsModule } from "./notifications/notifications.module";
import { SearchModule } from "./search/search.module";
import { StorageModule } from "./storage/storage.service";

const env = loadEnv();

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: env.LOG_LEVEL,
        genReqId: (req, res) => {
          const incoming = req.headers["x-request-id"];
          const id = typeof incoming === "string" && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
          res.setHeader("x-request-id", id);
          return id;
        },
        redact: ["req.headers.authorization", "req.headers.cookie", 'res.headers["set-cookie"]'],
        transport: env.NODE_ENV === "development" ? { target: "pino-pretty", options: { singleLine: true } } : undefined,
        autoLogging: { ignore: (req) => req.url?.startsWith("/api/v1/health") ?? false },
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: "default", ttl: 60_000, limit: env.RATE_LIMIT_PER_MINUTE }],
      skipIf: () => env.DISABLE_RATE_LIMIT,
    }),
    PrismaModule,
    AuditModule,
    StorageModule,
    NotificationsModule.register(),
    AuthModule,
    SearchModule,
    CategoriesModule,
    ListingsModule,
    EngagementModule,
    UsersModule,
    ProvidersModule,
    AdminModule,
    AiModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ClientThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
