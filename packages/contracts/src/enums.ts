// String-literal enums shared by the API, website and mobile app.
// They mirror the Prisma enums in packages/database/prisma/schema.prisma — keep them in sync.

export const ROLES = ["CONSUMER", "PROVIDER", "ORGANIZER", "EMPLOYER", "ADVERTISER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const LISTING_KINDS = ["SERVICE", "EVENT", "JOB", "PROPERTY", "RESOURCE"] as const;
export type ListingKind = (typeof LISTING_KINDS)[number];

export const LISTING_STATUSES = ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "REJECTED", "ARCHIVED"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const VERIFICATION_STATUSES = ["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const INQUIRY_STATUSES = ["NEW", "VIEWED", "RESPONDED", "CLOSED", "SPAM"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const APPLICATION_STATUSES = ["SUBMITTED", "REVIEWING", "INTERVIEW", "OFFERED", "REJECTED", "WITHDRAWN"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const REGISTRATION_STATUSES = ["REGISTERED", "WAITLISTED", "CANCELLED"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "TEMPORARY"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const WORK_ARRANGEMENTS = ["ONSITE", "HYBRID", "REMOTE"] as const;
export type WorkArrangement = (typeof WORK_ARRANGEMENTS)[number];

export const SALARY_PERIODS = ["HOUR", "MONTH", "YEAR"] as const;
export type SalaryPeriod = (typeof SALARY_PERIODS)[number];

export const PROPERTY_TYPES = ["APARTMENT", "HOUSE", "TOWNHOUSE", "CONDO", "ROOM", "COMMERCIAL", "LAND"] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const TRANSACTION_TYPES = ["RENT", "SALE", "ROOMMATE"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const CREDENTIAL_TYPES = [
  "BUSINESS_LICENSE",
  "INSURANCE_LICENSE",
  "BAR_ADMISSION",
  "MEDICAL_LICENSE",
  "CPA_LICENSE",
  "REAL_ESTATE_LICENSE",
  "CONTRACTOR_LICENSE",
  "OTHER",
] as const;
export type CredentialType = (typeof CREDENTIAL_TYPES)[number];

export const REPORT_REASONS = ["SPAM", "FRAUD", "INAPPROPRIATE", "MISLEADING", "DUPLICATE", "OTHER"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_STATUSES = ["OPEN", "RESOLVED", "DISMISSED"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const CONTACT_METHODS = ["EMAIL", "PHONE", "EITHER"] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number];

export const SORT_OPTIONS = ["relevance", "newest", "distance", "price_asc", "price_desc", "start_date"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

/** Human-readable labels for enum values shown in UI. */
export function enumLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
