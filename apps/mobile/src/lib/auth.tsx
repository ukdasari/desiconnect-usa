import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { MeDto, SessionDto } from "@desiconnect/contracts";
import { api, setAuthHooks } from "./api";
import { endProviderSession, refreshTokens, signInWithProvider, type OidcSettings, type OidcTokens } from "./oidc";
import { unregisterPush } from "./push";
import { KEYS, secure } from "./storage";

type Mode = "local" | "oidc";

/** What is persisted in secure storage. */
type StoredSession =
  | { mode: "local"; token: string; expiresAt: number }
  | ({ mode: "oidc" } & OidcTokens);

interface AuthState {
  status: "loading" | "signedOut" | "signedIn";
  mode: Mode | null;
  me: MeDto | null;
  /** Error from loading the sign-in configuration (API unreachable). */
  configError: string | null;
}

interface AuthApi extends AuthState {
  signInWithPassword: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  /** OIDC: opens the provider's sign-in page. Resolves false if the user cancelled. */
  signInWithProvider: (opts?: { signup?: boolean }) => Promise<boolean>;
  signOut: () => Promise<void>;
  reloadMe: () => Promise<void>;
  retryConfig: () => void;
}

const AuthContext = createContext<AuthApi | null>(null);
const REFRESH_SKEW = 60;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading", mode: null, me: null, configError: null });
  const [configAttempt, setConfigAttempt] = useState(0);
  const session = useRef<StoredSession | null>(null);
  const oidc = useRef<OidcSettings | null>(null);
  const refreshing = useRef<Promise<string | null> | null>(null);

  const persist = useCallback(async (s: StoredSession | null) => {
    session.current = s;
    if (s) await secure.set(KEYS.session, JSON.stringify(s));
    else await secure.remove(KEYS.session);
  }, []);

  const clear = useCallback(async () => {
    await persist(null);
    setState((st) => ({ ...st, status: "signedOut", me: null }));
  }, [persist]);

  /** Returns a usable bearer token, refreshing OIDC tokens shortly before they expire (single-flight). */
  const getToken = useCallback(async (): Promise<string | null> => {
    const s = session.current;
    if (!s) return null;
    const now = Math.floor(Date.now() / 1000);
    if (s.mode === "local") return s.expiresAt > now ? s.token : null;
    if (s.expiresAt - REFRESH_SKEW > now) return s.accessToken;
    if (!oidc.current || !s.refreshToken) return null;
    refreshing.current ??= refreshTokens(oidc.current, s)
      .then(async (t) => {
        await persist({ mode: "oidc", ...t });
        return t.accessToken;
      })
      .catch(async () => {
        await clear();
        return null;
      })
      .finally(() => {
        refreshing.current = null;
      });
    return refreshing.current;
  }, [clear, persist]);

  useEffect(() => {
    setAuthHooks({ getToken, onUnauthorized: () => void clear() });
  }, [getToken, clear]);

  const loadMe = useCallback(async () => {
    const { data } = await api<MeDto>("/me");
    setState((st) => ({ ...st, status: "signedIn", me: data }));
  }, []);

  // Startup: learn the sign-in mode, restore a stored session.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api<{ mode: Mode; issuer: string | null; audience: string | null }>("/auth/config", { anonymous: true });
        oidc.current = data.mode === "oidc" && data.issuer ? { issuer: data.issuer, audience: data.audience } : null;
        const raw = await secure.get(KEYS.session);
        const stored = raw ? (JSON.parse(raw) as StoredSession) : null;
        session.current = stored && stored.mode === data.mode ? stored : null;
        if (cancelled) return;
        setState((st) => ({ ...st, mode: data.mode, configError: null }));
        if (session.current) {
          try {
            await loadMe();
            return;
          } catch {
            await persist(null);
          }
        }
        if (!cancelled) setState((st) => ({ ...st, status: "signedOut" }));
      } catch {
        if (!cancelled) setState({ status: "signedOut", mode: null, me: null, configError: "Can't reach 1StopDesi right now." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [configAttempt, loadMe, persist]);

  const value = useMemo<AuthApi>(
    () => ({
      ...state,
      async signInWithPassword(email, password) {
        const { data } = await api<SessionDto>("/auth/login", { method: "POST", anonymous: true, body: { email, password } });
        await persist({ mode: "local", token: data.token, expiresAt: Math.floor(new Date(data.expiresAt).getTime() / 1000) });
        setState((st) => ({ ...st, status: "signedIn", me: data.user }));
      },
      async register(name, email, password) {
        const { data } = await api<SessionDto>("/auth/register", { method: "POST", anonymous: true, body: { name, email, password } });
        await persist({ mode: "local", token: data.token, expiresAt: Math.floor(new Date(data.expiresAt).getTime() / 1000) });
        setState((st) => ({ ...st, status: "signedIn", me: data.user }));
      },
      async signInWithProvider(opts) {
        if (!oidc.current) throw new Error("Sign-in isn't configured");
        const tokens = await signInWithProvider(oidc.current, opts);
        if (!tokens) return false;
        // The API verifies both tokens and creates or links the account.
        const { data } = await api<MeDto>("/auth/session", { method: "POST", token: tokens.accessToken, body: { idToken: tokens.idToken } });
        await persist({ mode: "oidc", ...tokens });
        setState((st) => ({ ...st, status: "signedIn", me: data }));
        return true;
      },
      async signOut() {
        const s = session.current;
        await unregisterPush().catch(() => {});
        await clear();
        if (s?.mode === "oidc" && oidc.current) await endProviderSession(oidc.current, s.idToken);
      },
      reloadMe: loadMe,
      retryConfig: () => setConfigAttempt((n) => n + 1),
    }),
    [state, persist, clear, loadMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
