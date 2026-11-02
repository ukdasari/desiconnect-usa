// Runtime configuration from EXPO_PUBLIC_* variables (inlined at build time by Expo).
// Android emulators reach the host machine at 10.0.2.2; physical devices need your LAN IP.

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/v1").replace(/\/$/, "");

/** OIDC native client registered with your provider (public client + PKCE). */
export const OIDC_CLIENT_ID = process.env.EXPO_PUBLIC_OIDC_CLIENT_ID ?? "desiconnect-mobile";
export const OIDC_SCOPES = (process.env.EXPO_PUBLIC_OIDC_SCOPES ?? "openid profile email offline_access").split(/\s+/).filter(Boolean);
/** Must match a redirect URI registered with the provider. */
export const APP_SCHEME = "desiconnect";
export const OIDC_REDIRECT_PATH = "auth/callback";

export const WEBSITE_URL = (process.env.EXPO_PUBLIC_WEBSITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
