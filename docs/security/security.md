# Security and privacy

## Implemented

| Area | Control |
|---|---|
| Authentication | Global guard: every route needs a valid bearer token unless marked `@Public()`. Local mode: bcrypt (cost 12) + HS256 JWT; login responses don't reveal whether an email exists. OIDC mode: JWKS verification with issuer/audience checks. |
| Authorization | Role checks (`@Roles`) **and** object ownership checks in services (listing owner, inquiry owner/requester, employer/applicant, event organizer). Cross-user access returns 404 rather than leaking existence. Admin routes require `ADMIN`. |
| Suspension | Suspended accounts can read but every non-GET request is rejected (403). |
| Moderation | All user listings start as draft or pending review; edits to live listings go back to review. Admin decisions require a reason when rejecting and are written to `audit_logs` in the same transaction. |
| Validation | Zod schemas on every body and query; database CHECK constraints for critical invariants. |
| Uploads | Resumes: 5 MB limit, real type detected from magic bytes (PDF / DOCX) not the client header, private storage (local 0600 files or S3 with SSE), streamed only to applicant, employer or admin; every download audited. |
| Consent | Inquiries and applications require explicit consent to share contact details; each consent is stored in `consent_records`. |
| Rate limiting | 120 req/min/IP globally, 10/min on register/login, 12/min on AI chat, plus a per-user daily AI quota. |
| Transport & headers | Helmet on the API; nosniff, frame denial, referrer and permissions policies on the website; CORS allow-list. |
| Secrets | Validated at boot; never sent to clients. Logs redact `authorization`, `cookie` and `set-cookie`. |
| Session cookie | httpOnly, SameSite=Lax, `Secure` when `SESSION_COOKIE_SECURE=true` (set this in production). |
| Errors | Uniform error envelope with trace IDs; stack traces never returned. |
| AI | Safety routing before search; LLM limited to intent extraction with schema-validated output; no tools; no actions taken for the user. |

Automated coverage: `apps/api/test/api.e2e-spec.ts` tests unauthenticated access, forged tokens, role enforcement,
cross-user edits, inquiry privacy, resume download restrictions, suspension and AI quotas against a real database.

## Before public launch (needs work or professional review)

- **CSRF**: server actions are protected by Next's origin checks; confirm behind your production proxy/CDN.
- **Rate-limit storage** is in memory per API instance. Use the throttler Redis storage when running more than one instance.
- **Email verification and password reset** are not implemented in local auth. Prefer `AUTH_MODE=oidc` with a managed
  provider for launch, or add both flows.
- **Virus scanning** of uploads (e.g. ClamAV or S3 malware protection) is not wired in.
- **Credential verification is manual**: admins must check license numbers with the issuing state authority. No automated
  license lookups exist.
- **Data retention**: define retention for inquiries, resumes, AI history and audit logs; add account deletion/export.
- **Monitoring**: structured logs and trace IDs exist; Sentry (or similar) is not yet configured.
- **Legal review** (see blueprint §11): attorney and insurance referrals, real estate advertising (fair housing),
  employment listings (EEO), privacy policy / terms, and Texas-specific rules. The disclaimer text in
  `packages/contracts/src/categories.ts` is placeholder wording.
