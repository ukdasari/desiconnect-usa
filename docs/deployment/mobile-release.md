# Mobile app: setup and store release

The app in `apps/mobile` is an Expo SDK 58 / React Native 0.88 app built with EAS. **Nothing has been built on EAS or
submitted to a store yet.** This page lists what to set up, in order.

## 1. One-time project setup

| Step | Command / where | Notes |
|---|---|---|
| Expo account + EAS CLI | `npm i -g eas-cli && eas login` | Free plan is enough for internal builds |
| Link the project | `cd apps/mobile && eas init` | Writes `extra.eas.projectId` into `app.json`. Push needs this |
| Bundle IDs | `app.json` → `ios.bundleIdentifier`, `android.package` | Currently `com.desiconnect.usa`; change before the first store build, it can't be changed later |
| Apple Developer Program | developer.apple.com ($99/yr) | Needed for TestFlight and the App Store |
| Google Play Console | play.google.com/console ($25 once) | Needed for internal testing and release |
| Icons and splash | `apps/mobile/assets/` | Replace the placeholders: 1024×1024 icon, Android adaptive foreground, splash |

## 2. Environment per build profile

`EXPO_PUBLIC_*` values are compiled into the app. Set them per profile with EAS environment variables
(`eas env:create --environment preview|production`) or in `eas.json` → `build.<profile>.env`:

| Variable | Example |
|---|---|
| `EXPO_PUBLIC_API_URL` | `https://api.desiconnect.example/api/v1` (HTTPS only for store builds) |
| `EXPO_PUBLIC_OIDC_CLIENT_ID` | the native client ID from your provider |
| `EXPO_PUBLIC_WEBSITE_URL` | `https://desiconnect.example` |

## 3. Sign-in (OIDC)

1. Register a **native / public** client with your provider: authorization code + PKCE, no client secret,
   redirect URI `desiconnect://auth/callback`, scopes `openid profile email offline_access`.
2. Add its client ID to the API's `OIDC_CLIENT_IDS` (comma-separated, alongside the web client).
3. If the provider issues access tokens for an API audience, the API's `OIDC_AUDIENCE` is sent automatically.

For local work, `pnpm oidc:dev` already includes `desiconnect-mobile` with that redirect URI.

## 4. Push notifications

1. `eas init` (projectId) — without it the app reports push as unavailable and keeps using the in-app inbox.
2. iOS: `eas credentials` creates the APNs key. Android: upload an FCM v1 service-account key in the Expo dashboard
   (Project → Credentials → Android → FCM V1).
3. API: `PUSH_PROVIDER=expo`; set `EXPO_ACCESS_TOKEN` if enhanced push security is on.
4. Test on a physical device (simulators/emulators don't get push tokens): sign in, allow notifications, then send a
   request to that user's listing — the provider's phone should receive it. Tokens rejected as `DeviceNotRegistered`
   are deleted automatically.

## 5. Builds

```bash
cd apps/mobile
eas build --profile preview --platform android   # APK for sideloading/internal testers
eas build --profile preview --platform ios       # internal distribution (register test devices first)
eas build --profile production --platform all    # store binaries; version auto-increments (appVersionSource: remote)
eas submit --profile production --platform ios   # → TestFlight
eas submit --profile production --platform android  # → Play internal testing track
```

## 6. Store checklist

**Both stores**
- [ ] Privacy policy and terms URLs live on the website and linked from the store listings
- [x] In-app account deletion: Profile → Delete account (app) and Account → Delete your account (website), both calling
      `DELETE /me`. Personal data and files are removed; with OIDC, the identity-provider account is separate (say so in the
      store listing's account-deletion URL field: `https://<website>/account#delete-account`)
- [ ] Demo listings clearly labelled (the app shows a "Demo" badge) or removed from the production database
- [ ] Reviewer account in the review notes (production must use OIDC; create a normal user with your provider)
- [ ] Screenshots: 6.9" and 6.5" iPhone, 13" iPad if `supportsTablet` stays on, Android phone
- [ ] Age rating questionnaire (user-generated content with reporting → answer accordingly)
- [ ] Content moderation: in-app reporting exists on every listing; admins review in the web admin

**App Store (Apple)**
- [ ] App Privacy "nutrition label": contact info (name, email, phone — only when the user consents to share with a
      provider), coarse location (app functionality, not linked to tracking), user content (résumés, messages),
      identifiers (push token). No tracking → no ATT prompt needed
- [ ] Location purpose string is in `app.json` (`expo-location` plugin) — coarse "When In Use" only
- [ ] Sign in with Apple: required only if you add other third-party social logins as the primary sign-in on iOS
- [ ] Export compliance: standard HTTPS only (`ITSAppUsesNonExemptEncryption = false`)

**Google Play**
- [ ] Data safety form mirroring the Apple label above
- [ ] Only `ACCESS_COARSE_LOCATION` is declared (fine and background location are blocked in `app.json`)
- [ ] Notification permission (Android 13+) is requested at runtime from Profile, not at launch
- [ ] Target API level as required by Play at submission time (set by the Expo SDK)
- [ ] Closed testing with 12+ testers for 14 days if the developer account is a new personal account

## 7. What's tested and what isn't

- `pnpm --filter @desiconnect/mobile test` — API client, auth provider, location/format helpers, components.
- `pnpm --filter @desiconnect/mobile typecheck`, and `npx expo export --platform ios|android|web` all succeed.
- The web preview was driven end to end with Playwright (consumer and provider journeys).
- **Not yet done:** running on a real phone or simulator, push delivery, OIDC on device against a hosted provider,
  EAS builds, store review.
