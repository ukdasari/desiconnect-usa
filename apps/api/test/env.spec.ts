import { loadEnv } from "../src/config/env";

const base = { DATABASE_URL: "postgresql://x", JWT_SECRET: "x".repeat(40) };

describe("environment guard", () => {
  it("refuses local email/password auth in production unless explicitly allowed", () => {
    expect(() => loadEnv({ ...base, NODE_ENV: "production", AUTH_MODE: "local" })).toThrow(/Production must use AUTH_MODE=oidc/);
    expect(() => loadEnv({ ...base, NODE_ENV: "production", AUTH_MODE: "local", ALLOW_LOCAL_AUTH_IN_PRODUCTION: "true" })).not.toThrow();
  });

  it("requires an https issuer and client IDs for OIDC in production", () => {
    const oidc = { ...base, NODE_ENV: "production", AUTH_MODE: "oidc" };
    expect(() => loadEnv({ ...oidc, OIDC_ISSUER: "http://idp.example", OIDC_CLIENT_IDS: "web" })).toThrow(/https/);
    expect(() => loadEnv({ ...oidc, OIDC_ISSUER: "https://idp.example/" })).toThrow(/OIDC_CLIENT_IDS/);
    expect(() => loadEnv({ ...oidc, OIDC_ISSUER: "https://idp.example/", OIDC_CLIENT_IDS: "web" })).not.toThrow();
  });
});
