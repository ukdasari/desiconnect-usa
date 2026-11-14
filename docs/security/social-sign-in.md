# Social sign-in: Google, Facebook and X

The website's sign-in and register pages show **Continue with Google**, **Continue with Facebook** and **Continue with X**.
A button appears once that provider is set up. Each provider takes about 15 minutes to set up. Below, `1stopdesi.com`
stands for your website's address. Use the `*.run.app` address until you have a domain, and update it afterwards.

## How it works

```
browser ──▶ /auth/social/google ──▶ Google sign-in ──▶ /auth/social/google/callback?code&state ──▶ API POST /auth/social
          (website: state + PKCE           (user picks          (website checks state,               (API swaps the code for the
           in an httpOnly cookie)           an account)          forwards code + verifier)            profile using the secret,
                                                                                                      signs in / creates the user)
```

- **Secrets:** they live only on the API, in Secret Manager. The website only knows the public client IDs, which it
  gets from `GET /auth/config`.
- **First sign-in:** creates an account from the provider's name and email, with no password. The link between the
  account and the provider is kept in `social_identities`.
- **Linking to an existing account:** when the email already has an account, the provider login is linked to it, but only
  if the provider confirms the person owns the email. Google (`email_verified`) and X (`confirmed_email`) confirm it.
  Facebook doesn't say, so in that case the person is asked to sign in with their password instead. This prevents
  someone taking over an account by making a social profile with another person's email.
- **No email shared:** if the provider shares no email (for example an X account without a confirmed email), sign-in
  stops with a clear message, because every account needs an email.
- **Account deletion:** deleting the account removes the social links too.
- **With Auth0** (`AUTH_MODE=oidc`): use Auth0's own Google/Facebook/X connections. Then set
  `OIDC_SOCIAL_CONNECTIONS=google=google-oauth2,facebook=facebook,x=twitter` and the same buttons go straight to them.
  Skip the steps below.

Required pages, already on the site:
- `/privacy`: privacy policy.
- `/terms`: terms of service.
- `/data-deletion`: deletion instructions.

Set `SUPPORT_EMAIL` in `config.env` so they show your real contact address. **Have a lawyer review the privacy policy
and terms before launch.** They are a starting point that matches what the app actually does.

## Google

1. **Create the client.** In Google Cloud console, go to **APIs & Services → Credentials → Create credentials → OAuth
   client ID**. Use the same project as the deployment.
2. **Consent screen.** If asked, set up the consent screen first:
   - User type **External**.
   - App name **1StopDesi**, support email, and logo (optional).
   - Authorized domain `1stopdesi.com`.
   - Privacy policy `https://1stopdesi.com/privacy`, terms of service `https://1stopdesi.com/terms`.
   - Scopes `openid`, `email` and `profile`. These are basic scopes and need no Google review.
   - **Publish** the app. While it's in "Testing", only listed test users can sign in.
3. **Client settings:**
   - Application type **Web application**.
   - Authorized redirect URI `https://1stopdesi.com/auth/social/google/callback`.
4. **Store the keys.** Put the **Client ID** in `config.env` as `GOOGLE_CLIENT_ID`, then store the secret:
   `printf '%s' 'GOCSPX-…' | gcloud secrets create google-client-secret --data-file=-`

## Facebook

1. **Create the app.** At <https://developers.facebook.com/apps>, choose **Create app → Authenticate and request data
   from users with Facebook Login**.
2. **Login settings.** Under **Facebook Login → Settings**, set **Valid OAuth Redirect URIs** to
   `https://1stopdesi.com/auth/social/facebook/callback`.
3. **Basic settings.** Under **App settings → Basic**:
   - App domain `1stopdesi.com`.
   - Privacy policy URL `https://1stopdesi.com/privacy`, terms of service URL `https://1stopdesi.com/terms`.
   - **User data deletion → Data deletion instructions URL** `https://1stopdesi.com/data-deletion`.
   - Category and app icon.
4. **Go live.** Switch the app to **Live**. While it's in development mode, only people with a role on the app can sign
   in.
5. **Permissions.** Ask for only `email` and `public_profile`.
6. **Store the keys.** Put the **App ID** in `config.env` as `FACEBOOK_APP_ID`, then store the secret:
   `printf '%s' '…' | gcloud secrets create facebook-app-secret --data-file=-`

## X

1. **Open your app.** At <https://developer.x.com>, open the project and app. The free tier is enough for sign-in.
2. **Authentication settings.** Under **User authentication settings → Set up**:
   - App permissions **Read**.
   - Turn on **Request email from users**. Without it, X doesn't share the email and sign-in can't complete.
   - Type of app **Web App, Automated App or Bot**. This makes it a confidential client.
   - Callback URI `https://1stopdesi.com/auth/social/x/callback`.
   - Website URL `https://1stopdesi.com`.
   - Terms of service `https://1stopdesi.com/terms`, privacy policy `https://1stopdesi.com/privacy`.
3. **Keys.** Under **Keys and tokens → OAuth 2.0 Client ID and Client Secret**, put the **Client ID** in `config.env` as
   `X_CLIENT_ID`, then store the secret:
   `printf '%s' '…' | gcloud secrets create x-client-secret --data-file=-`

The website asks X for the `tweet.read users.read users.email` scopes. X requires `tweet.read` to read the profile.
1StopDesi never reads or posts tweets.

## Turn it on

```bash
infrastructure/gcp/setup.sh      # lets the API read the new secrets
infrastructure/gcp/deploy.sh     # or SKIP_BUILD=1 TAG=<current tag> infrastructure/gcp/deploy.sh
```

Then open `/login`. Each provider you set up has its button. Try each one with a test account.

## Mobile app

The app still signs in with email and password. Social sign-in in the app needs each provider's native app settings:
- Google: iOS and Android client IDs.
- Facebook: app keys for iOS and Android.
- X: the app's redirect scheme.

It also needs one more API change, a one-time code handed back to the app. That's the next step once the website flow
is live.

## Local development

Add test values to `.env`. Providers accept `http://localhost:3000/auth/social/<provider>/callback` as a redirect when
you register it:
- Google allows localhost.
- Facebook allows localhost in development mode.
- X accepts `http://127.0.0.1` callbacks; use `APP_URL=http://127.0.0.1:3000` if X rejects `localhost`.
