// Environment for API tests. Runs before each test file (and is re-applied in global-setup).
const base = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/desiconnect_test?schema=public";

Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE_URL: base,
  REDIS_URL: "",
  AUTH_MODE: "local",
  JWT_SECRET: "test-secret-that-is-definitely-longer-than-32-chars",
  NOTIFICATIONS_INLINE: "true",
  DISABLE_RATE_LIMIT: "true",
  STORAGE_DRIVER: "local",
  STORAGE_LOCAL_DIR: "/tmp/desiconnect-test-storage",
  LOG_LEVEL: "silent",
  AI_PROVIDER: "none",
  AI_DAILY_REQUEST_LIMIT: "5",
  BOOTSTRAP_ADMIN_EMAILS: "",
  CORS_ORIGINS: "http://localhost:3000",
  INTERNAL_API_KEY: "test-internal-key-0123456789abcdef",
  WEB_URL: "https://desiconnect.test",
  GOOGLE_CLIENT_ID: "google-client-id",
  GOOGLE_CLIENT_SECRET: "google-secret",
  FACEBOOK_APP_ID: "fb-app-id",
  FACEBOOK_APP_SECRET: "fb-secret",
  X_CLIENT_ID: "x-client-id",
  X_CLIENT_SECRET: "x-secret",
});

export {};
