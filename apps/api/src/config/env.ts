import { z } from "zod";

const bool = z
  .enum(["true", "false", "1", "0"])
  .optional()
  .transform((v) => v === "true" || v === "1");

/** Environment variables are validated once at startup; the API refuses to boot on invalid config. */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    API_PORT: z.coerce.number().int().default(4000),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    REDIS_URL: z.string().optional().default(""),
    CORS_ORIGINS: z.string().default("http://localhost:3000"),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

    AUTH_MODE: z.enum(["local", "oidc"]).default("local"),
    JWT_SECRET: z.string().optional().default(""),
    JWT_TTL_SECONDS: z.coerce.number().int().min(300).default(604800),
    OIDC_ISSUER: z.string().optional().default(""),
    OIDC_AUDIENCE: z.string().optional().default(""),
    BOOTSTRAP_ADMIN_EMAILS: z.string().optional().default(""),

    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    STORAGE_LOCAL_DIR: z.string().default("./storage"),
    S3_BUCKET: z.string().optional().default(""),
    S3_REGION: z.string().optional().default("us-east-1"),
    S3_ENDPOINT: z.string().optional().default(""),
    S3_ACCESS_KEY_ID: z.string().optional().default(""),
    S3_SECRET_ACCESS_KEY: z.string().optional().default(""),

    AI_PROVIDER: z.enum(["none", "anthropic"]).default("none"),
    ANTHROPIC_API_KEY: z.string().optional().default(""),
    ANTHROPIC_MODEL: z.string().default("claude-haiku-4-5"),
    AI_DAILY_REQUEST_LIMIT: z.coerce.number().int().min(1).default(50),

    /** Process notifications synchronously instead of via BullMQ (tests, or when Redis is absent). */
    NOTIFICATIONS_INLINE: bool,
    /** Disable rate limiting (automated tests only). */
    DISABLE_RATE_LIMIT: bool,
  })
  .superRefine((env, ctx) => {
    if (env.AUTH_MODE === "local" && env.JWT_SECRET.length < 32) {
      ctx.addIssue({ code: "custom", path: ["JWT_SECRET"], message: "JWT_SECRET must be at least 32 characters when AUTH_MODE=local" });
    }
    if (env.AUTH_MODE === "oidc" && !env.OIDC_ISSUER) {
      ctx.addIssue({ code: "custom", path: ["OIDC_ISSUER"], message: "OIDC_ISSUER is required when AUTH_MODE=oidc" });
    }
    if (env.STORAGE_DRIVER === "s3" && !env.S3_BUCKET) {
      ctx.addIssue({ code: "custom", path: ["S3_BUCKET"], message: "S3_BUCKET is required when STORAGE_DRIVER=s3" });
    }
    if (env.AI_PROVIDER === "anthropic" && !env.ANTHROPIC_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["ANTHROPIC_API_KEY"], message: "ANTHROPIC_API_KEY is required when AI_PROVIDER=anthropic" });
    }
    if (env.NODE_ENV === "production" && env.DISABLE_RATE_LIMIT) {
      ctx.addIssue({ code: "custom", path: ["DISABLE_RATE_LIMIT"], message: "Rate limiting cannot be disabled in production" });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${lines}`);
  }
  return parsed.data;
}
