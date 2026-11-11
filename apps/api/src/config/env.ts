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
    /** Expected `aud` of access tokens sent to the API. Leave empty only if your provider omits it. */
    OIDC_AUDIENCE: z.string().optional().default(""),
    /** Comma-separated client IDs (web, mobile) whose ID tokens may be exchanged at POST /auth/session. */
    OIDC_CLIENT_IDS: z.string().optional().default(""),
    /** Reject identities whose provider says the email is unverified (default true). */
    OIDC_REQUIRE_VERIFIED_EMAIL: z.enum(["true", "false"]).optional().default("true").transform((v) => v === "true"),
    /** Explicit opt-in to keep email/password auth in production (not recommended). */
    ALLOW_LOCAL_AUTH_IN_PRODUCTION: bool,
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

    /** "expo" sends mobile push notifications through Expo's push service; "none" stores in-app notifications only. */
    PUSH_PROVIDER: z.enum(["none", "expo"]).default("none"),
    EXPO_ACCESS_TOKEN: z.string().optional().default(""),
    /** "resend" sends email through Resend (https://resend.com); "log" only writes emails to the log. */
    EMAIL_PROVIDER: z.enum(["log", "resend"]).default("log"),
    RESEND_API_KEY: z.string().optional().default(""),
    /** Sender, e.g. "DesiConnect <updates@desiconnect.com>". The domain must be verified with the provider. */
    EMAIL_FROM: z.string().default("DesiConnect <updates@desiconnect.example>"),
    /** Public website address, used for links in emails (alerts, unsubscribe). */
    WEB_URL: z.string().url().default("http://localhost:3000"),
    /** Process notifications synchronously instead of via BullMQ (tests, or when Redis is absent). */
    NOTIFICATIONS_INLINE: bool,
    /** Requests per minute per visitor. */
    RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(10).default(120),
    /** Shared secret the website sends so the API can rate-limit by the visitor's IP. Use 32+ random characters. */
    INTERNAL_API_KEY: z.string().optional().default("").refine((v) => v === "" || v.length >= 24, "INTERNAL_API_KEY must be at least 24 characters"),
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
    if (env.AUTH_MODE === "oidc" && !env.OIDC_CLIENT_IDS) {
      ctx.addIssue({ code: "custom", path: ["OIDC_CLIENT_IDS"], message: "OIDC_CLIENT_IDS is required when AUTH_MODE=oidc" });
    }
    if (env.AUTH_MODE === "oidc" && env.NODE_ENV === "production" && !env.OIDC_ISSUER.startsWith("https://")) {
      ctx.addIssue({ code: "custom", path: ["OIDC_ISSUER"], message: "OIDC_ISSUER must use https in production" });
    }
    if (env.AUTH_MODE === "local" && env.NODE_ENV === "production" && !env.ALLOW_LOCAL_AUTH_IN_PRODUCTION) {
      ctx.addIssue({
        code: "custom",
        path: ["AUTH_MODE"],
        message: "Production must use AUTH_MODE=oidc (local email/password has no verification or reset). Set ALLOW_LOCAL_AUTH_IN_PRODUCTION=true to override.",
      });
    }
    if (env.STORAGE_DRIVER === "s3" && !env.S3_BUCKET) {
      ctx.addIssue({ code: "custom", path: ["S3_BUCKET"], message: "S3_BUCKET is required when STORAGE_DRIVER=s3" });
    }
    if (env.EMAIL_PROVIDER === "resend" && !env.RESEND_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["RESEND_API_KEY"], message: "RESEND_API_KEY is required when EMAIL_PROVIDER=resend" });
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
