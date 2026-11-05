import { z } from "zod";
import {
  CONTACT_METHODS,
  CREDENTIAL_TYPES,
  EMPLOYMENT_TYPES,
  INQUIRY_STATUSES,
  APPLICATION_STATUSES,
  LISTING_KINDS,
  PROPERTY_TYPES,
  REPORT_REASONS,
  SALARY_PERIODS,
  SORT_OPTIONS,
  TRANSACTION_TYPES,
  WORK_ARRANGEMENTS,
} from "./enums";
import { LANGUAGES, STATE_CODES } from "./geo";

// ---------- primitives ----------

const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

export const stateCodeSchema = z.enum(STATE_CODES, { message: "Choose a US state" });
export const zipSchema = z.string().trim().regex(/^\d{5}$/, "Enter a 5-digit ZIP code");
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()\-.]{7,20}$/, "Enter a valid phone number");
export const languageSchema = z.enum(LANGUAGES);
export const slugSchema = z.string().trim().regex(/^[a-z0-9-]{2,60}$/, "Invalid slug");
export const uuidSchema = z.uuid();

/** Query-string boolean: accepts true/false/1/0. */
const queryBool = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
  .transform((v) => v === true || v === "true" || v === "1");

const optionalUrl = z
  .union([z.literal(""), z.url({ protocol: /^https?$/ })])
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const optionalEmail = z
  .union([z.literal(""), z.email()])
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const optionalPhone = z
  .union([z.literal(""), phoneSchema])
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const optionalZip = z
  .union([z.literal(""), zipSchema])
  .optional()
  .transform((v) => (v === "" ? undefined : v));

// ---------- auth ----------

export const registerSchema = z.object({
  name: trimmed(2, 80),
  email: z.email().transform((v) => v.toLowerCase()),
  password: z.string().min(8, "Use at least 8 characters").max(128),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email().transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const updateProfileSchema = z.object({
  name: trimmed(2, 80).optional(),
  phone: optionalPhone,
  city: optionalText(80),
  state: stateCodeSchema.optional(),
  zipCode: optionalZip,
  preferredLanguages: z.array(languageSchema).max(5).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ---------- search ----------

export const searchQuerySchema = z.object({
  q: optionalText(120),
  category: slugSchema.optional(),
  kind: z.enum(LISTING_KINDS).optional(),
  city: optionalText(80),
  state: stateCodeSchema.optional(),
  zip: optionalZip,
  radiusMiles: z.coerce.number().int().min(1).max(500).default(25),
  language: languageSchema.optional(),
  verifiedOnly: queryBool.optional(),
  // events
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  // jobs
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  workArrangement: z.enum(WORK_ARRANGEMENTS).optional(),
  // real estate
  transactionType: z.enum(TRANSACTION_TYPES).optional(),
  propertyType: z.enum(PROPERTY_TYPES).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minBeds: z.coerce.number().int().min(0).max(20).optional(),
  sort: z.enum(SORT_OPTIONS).default("relevance"),
  page: z.coerce.number().int().min(1).max(500).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type SearchQueryInput = z.input<typeof searchQuerySchema>;

// ---------- listings ----------

export const eventDetailsSchema = z
  .object({
    startAt: z.coerce.date(),
    endAt: z.coerce.date().optional(),
    venue: trimmed(2, 160),
    capacity: z.coerce.number().int().min(1).max(100000).optional(),
    isFree: z.boolean().default(true),
    ticketUrl: optionalUrl,
  })
  .refine((e) => !e.endAt || e.endAt >= e.startAt, { message: "End must be after start", path: ["endAt"] });

export const jobDetailsSchema = z
  .object({
    company: trimmed(2, 120),
    employmentType: z.enum(EMPLOYMENT_TYPES),
    workArrangement: z.enum(WORK_ARRANGEMENTS),
    salaryMin: z.coerce.number().int().min(0).optional(),
    salaryMax: z.coerce.number().int().min(0).optional(),
    salaryPeriod: z.enum(SALARY_PERIODS).optional(),
    skills: z.array(trimmed(1, 40)).max(20).default([]),
  })
  .refine((j) => j.salaryMin === undefined || j.salaryMax === undefined || j.salaryMax >= j.salaryMin, {
    message: "Maximum salary must be at least the minimum",
    path: ["salaryMax"],
  });

export const propertyDetailsSchema = z.object({
  transactionType: z.enum(TRANSACTION_TYPES),
  propertyType: z.enum(PROPERTY_TYPES),
  price: z.coerce.number().int().min(0).max(100_000_000),
  beds: z.coerce.number().min(0).max(20).optional(),
  baths: z.coerce.number().min(0).max(20).optional(),
  sqft: z.coerce.number().int().min(0).max(1_000_000).optional(),
  availableFrom: z.coerce.date().optional(),
});

const listingBase = {
  categorySlug: slugSchema,
  title: trimmed(5, 120),
  description: trimmed(20, 5000),
  addressLine: optionalText(160),
  city: trimmed(2, 80),
  state: stateCodeSchema,
  zipCode: optionalZip,
  languages: z.array(languageSchema).max(8).default([]),
  contactEmail: optionalEmail,
  contactPhone: optionalPhone,
  website: optionalUrl,
  priceText: optionalText(80),
  tags: z.array(trimmed(1, 30)).max(10).default([]),
};

export const createListingSchema = z.object({
  ...listingBase,
  /** Save without submitting for review. */
  saveAsDraft: z.boolean().default(false),
  event: eventDetailsSchema.optional(),
  job: jobDetailsSchema.optional(),
  property: propertyDetailsSchema.optional(),
});
export type CreateListingInput = z.input<typeof createListingSchema>;
export type CreateListing = z.infer<typeof createListingSchema>;

export const updateListingSchema = z.object({
  title: listingBase.title.optional(),
  description: listingBase.description.optional(),
  addressLine: listingBase.addressLine,
  city: listingBase.city.optional(),
  state: listingBase.state.optional(),
  zipCode: listingBase.zipCode,
  languages: z.array(languageSchema).max(8).optional(),
  contactEmail: listingBase.contactEmail,
  contactPhone: listingBase.contactPhone,
  website: listingBase.website,
  priceText: listingBase.priceText,
  tags: z.array(trimmed(1, 30)).max(10).optional(),
  event: eventDetailsSchema.optional(),
  job: jobDetailsSchema.optional(),
  property: propertyDetailsSchema.optional(),
  /** "submit" sends a draft/rejected listing to review, "archive" hides it. */
  action: z.enum(["submit", "archive"]).optional(),
});
export type UpdateListingInput = z.input<typeof updateListingSchema>;

// ---------- inquiries ----------

export const createInquirySchema = z.object({
  listingId: uuidSchema,
  message: trimmed(10, 2000),
  phone: optionalPhone,
  preferredContact: z.enum(CONTACT_METHODS).default("EMAIL"),
  /** The user must explicitly agree to share their contact details with the provider. */
  consentToShare: z.literal(true, { message: "You must agree to share your contact details" }),
});
export type CreateInquiryInput = z.input<typeof createInquirySchema>;

export const updateInquirySchema = z.object({
  status: z.enum(INQUIRY_STATUSES).optional(),
  providerResponse: optionalText(2000),
});
export type UpdateInquiryInput = z.input<typeof updateInquirySchema>;

// ---------- events / jobs ----------

export const eventRegistrationSchema = z.object({
  guests: z.coerce.number().int().min(1).max(10).default(1),
});
export type EventRegistrationInput = z.input<typeof eventRegistrationSchema>;

/** Text fields of a job application; the resume arrives as a multipart file named `resume`. */
export const jobApplicationSchema = z.object({
  coverLetter: optionalText(4000),
  phone: optionalPhone,
  consentToShare: queryBool.refine((v) => v === true, "You must agree to share your application with the employer"),
});
export type JobApplicationInput = z.input<typeof jobApplicationSchema>;

export const updateApplicationSchema = z.object({
  status: z.enum(APPLICATION_STATUSES),
});

export const RESUME_MAX_BYTES = 5 * 1024 * 1024;
export const RESUME_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

// ---------- providers ----------

export const providerOnboardingSchema = z.object({
  businessName: trimmed(2, 120),
  description: trimmed(20, 3000),
  email: z.email(),
  phone: phoneSchema,
  website: optionalUrl,
  categorySlugs: z.array(slugSchema).min(1, "Choose at least one category").max(5),
  languages: z.array(languageSchema).min(1, "Choose at least one language").max(8),
  addressLine: optionalText(160),
  city: trimmed(2, 80),
  state: stateCodeSchema,
  zipCode: optionalZip,
  serviceRadiusMiles: z.coerce.number().int().min(0).max(500).default(25),
});
export type ProviderOnboardingInput = z.input<typeof providerOnboardingSchema>;

export const updateProviderSchema = providerOnboardingSchema.partial();

export const credentialSubmissionSchema = z.object({
  type: z.enum(CREDENTIAL_TYPES),
  jurisdiction: stateCodeSchema,
  licenseNumber: trimmed(2, 60),
  issuingAuthority: optionalText(160),
  expiresAt: z.coerce.date().optional(),
});
export type CredentialSubmissionInput = z.input<typeof credentialSubmissionSchema>;

// ---------- moderation / admin ----------

export const moderationDecisionSchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT"]),
    reason: optionalText(1000),
  })
  .refine((d) => d.decision === "APPROVE" || (d.reason && d.reason.length >= 5), {
    message: "Give a reason when rejecting",
    path: ["reason"],
  });
export type ModerationDecisionInput = z.input<typeof moderationDecisionSchema>;

export const createReportSchema = z.object({
  targetType: z.enum(["LISTING", "PROVIDER", "REVIEW"]),
  targetId: uuidSchema,
  reason: z.enum(REPORT_REASONS),
  details: optionalText(2000),
});
export type CreateReportInput = z.input<typeof createReportSchema>;

export const resolveReportSchema = z.object({
  status: z.enum(["RESOLVED", "DISMISSED"]),
  resolutionNote: optionalText(1000),
  /** Optionally archive the reported listing at the same time. */
  archiveTarget: z.boolean().default(false),
});

export const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  body: trimmed(10, 2000),
});

export const suspendUserSchema = z.object({
  suspended: z.boolean(),
  reason: optionalText(500),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// ---------- devices (push notifications) ----------

/** A business owner asks to take over an unclaimed directory listing. */
export const createClaimSchema = z.object({
  role: z.string().trim().min(2, "Tell us your role at the business").max(80),
  phone: z.string().trim().min(7, "Enter a phone number we can call").max(30),
  verification: optionalText(500),
});
export type CreateClaimInput = z.input<typeof createClaimSchema>;

/** Account deletion must be confirmed by typing DELETE. */
export const deleteAccountSchema = z.object({
  confirm: z.literal("DELETE", { message: 'Type DELETE to confirm' }),
});

export const registerDeviceSchema = z.object({
  /** Expo push token, e.g. ExponentPushToken[xxxx]. */
  token: z.string().trim().regex(/^Expo(nent)?PushToken\[[^\]]{10,200}\]$/, "Not an Expo push token"),
  platform: z.enum(["ios", "android", "web"]),
});
export type RegisterDeviceInput = z.input<typeof registerDeviceSchema>;

// ---------- AI ----------

export const aiChatSchema = z.object({
  message: trimmed(1, 1000),
  conversationId: uuidSchema.optional(),
  location: z
    .object({
      city: optionalText(80),
      state: stateCodeSchema.optional(),
      zip: optionalZip,
    })
    .optional(),
});
export type AiChatInput = z.input<typeof aiChatSchema>;
