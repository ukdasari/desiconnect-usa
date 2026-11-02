import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import Redis from "ioredis";
import { Public } from "../auth/decorators";
import { APP_CONFIG, type AppConfig } from "../config/config.module";
import { PrismaService } from "../common/prisma.service";

@ApiTags("health")
@SkipThrottle()
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** Liveness: the process is up. */
  @Public()
  @Get()
  live() {
    return { status: "ok", uptimeSeconds: Math.round(process.uptime()) };
  }

  /** Readiness: dependencies are reachable. */
  @Public()
  @Get("ready")
  async ready() {
    const checks: Record<string, "ok" | "fail" | "skipped"> = { database: "fail", postgis: "fail", redis: "skipped" };
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = "ok";
      const rows = await this.prisma.$queryRaw<{ v: string }[]>`SELECT postgis_version() AS v`;
      checks.postgis = rows.length ? "ok" : "fail";
    } catch {
      /* reported below */
    }
    if (this.config.REDIS_URL) {
      const redis = new Redis(this.config.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 0, connectTimeout: 1500 });
      try {
        await redis.connect();
        checks.redis = (await redis.ping()) === "PONG" ? "ok" : "fail";
      } catch {
        checks.redis = "fail";
      } finally {
        redis.disconnect();
      }
    }
    if (Object.values(checks).includes("fail")) throw new ServiceUnavailableException({ code: "NOT_READY", message: "Dependencies unavailable", details: checks });
    return { status: "ready", checks };
  }
}
