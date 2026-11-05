// Response shapes returned by the API (`/api/v1`). Every response is wrapped in an envelope.
import type {
  ApplicationStatus,
  CredentialType,
  EmploymentType,
  InquiryStatus,
  ListingKind,
  ListingStatus,
  PropertyType,
  RegistrationStatus,
  ReportReason,
  ReportStatus,
  Role,
  SalaryPeriod,
  TransactionType,
  VerificationStatus,
  WorkArrangement,
  ContactMethod,
} from "./enums";

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  data: T;
  meta?: PaginationMeta & Record<string, unknown>;
  traceId: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    /** Field-level validation errors keyed by dotted path. */
    details?: Record<string, string[]>;
  };
  traceId: string;
}

export const ERROR_CODES = {
  VALIDATION_FAILED: "VALIDATION_FAILED",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  INTERNAL: "INTERNAL_ERROR",
} as const;

// ---------- DTOs ----------

export interface CategoryDto {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  icon: string;
  kind: ListingKind;
  regulated: boolean;
  parentSlug: string | null;
  listingCount: number;
  children: Omit<CategoryDto, "children">[];
}

export interface LocationDto {
  addressLine: string | null;
  city: string;
  state: string;
  zipCode: string | null;
  /** Omitted when the owner has not allowed exact coordinates. */
  latitude: number | null;
  longitude: number | null;
}

export interface ProviderSummaryDto {
  id: string;
  businessName: string;
  verification: VerificationStatus;
  languages: string[];
}

export interface EventDetailsDto {
  startAt: string;
  endAt: string | null;
  venue: string;
  capacity: number | null;
  isFree: boolean;
  ticketUrl: string | null;
  registeredCount: number;
}

export interface JobDetailsDto {
  company: string;
  employmentType: EmploymentType;
  workArrangement: WorkArrangement;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryPeriod: SalaryPeriod | null;
  skills: string[];
}

export interface PropertyDetailsDto {
  transactionType: TransactionType;
  propertyType: PropertyType;
  price: number;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  availableFrom: string | null;
}

export interface ListingSummaryDto {
  id: string;
  slug: string;
  kind: ListingKind;
  title: string;
  excerpt: string;
  /** Top-level category (one of the 15). */
  category: { slug: string; name: string; icon: string };
  subcategory: { slug: string; name: string } | null;
  location: LocationDto;
  languages: string[];
  priceText: string | null;
  provider: ProviderSummaryDto | null;
  /** Demonstration content created by the seed script — never a real business. */
  isDemo: boolean;
  /** Distance from the search center, when a location was supplied. */
  distanceMiles: number | null;
  event: EventDetailsDto | null;
  job: JobDetailsDto | null;
  property: PropertyDetailsDto | null;
  isFavorite?: boolean;
  publishedAt: string | null;
  /** Free-form labels (cuisine, "Halal", "Vegetarian"…). */
  tags: string[];
}

export interface CredentialDto {
  id: string;
  type: CredentialType;
  jurisdiction: string;
  licenseNumber: string;
  issuingAuthority: string | null;
  expiresAt: string | null;
  reviewStatus: VerificationStatus;
  reviewedAt: string | null;
}

export interface ReviewDto {
  id: string;
  rating: number;
  body: string;
  authorName: string;
  createdAt: string;
}

export interface ListingDetailDto extends ListingSummaryDto {
  description: string;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  status: ListingStatus;
  regulated: boolean;
  credentials: CredentialDto[];
  reviews: ReviewDto[];
  ratingAverage: number | null;
  ratingCount: number;
  ownerId: string;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderDto {
  id: string;
  businessName: string;
  description: string;
  email: string;
  phone: string;
  website: string | null;
  verification: VerificationStatus;
  languages: string[];
  categories: { slug: string; name: string }[];
  location: LocationDto | null;
  serviceRadiusMiles: number | null;
  credentials: CredentialDto[];
  isDemo: boolean;
  createdAt: string;
}

export interface MeDto {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  preferredLanguages: string[];
  roles: Role[];
  providerId: string | null;
  suspended: boolean;
  createdAt: string;
}

export interface SessionDto {
  token: string;
  expiresAt: string;
  user: MeDto;
}

export interface InquiryDto {
  id: string;
  status: InquiryStatus;
  message: string;
  phone: string | null;
  preferredContact: ContactMethod;
  providerResponse: string | null;
  respondedAt: string | null;
  createdAt: string;
  listing: { id: string; slug: string; title: string; categorySlug: string };
  /** Present for the listing owner only. */
  requester?: { name: string | null; email: string };
}

export interface ApplicationDto {
  id: string;
  status: ApplicationStatus;
  coverLetter: string | null;
  phone: string | null;
  hasResume: boolean;
  createdAt: string;
  job: { listingId: string; slug: string; title: string; company: string };
  applicant?: { name: string | null; email: string };
}

export interface RegistrationDto {
  id: string;
  status: RegistrationStatus;
  guests: number;
  createdAt: string;
  event: { listingId: string; slug: string; title: string; startAt: string; venue: string };
}

export interface ReportDto {
  id: string;
  targetType: "LISTING" | "PROVIDER" | "REVIEW";
  targetId: string;
  targetTitle: string | null;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  reporterEmail: string;
}

export interface AuditLogDto {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  actorEmail: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AdminStatsDto {
  users: number;
  providers: { total: number; verified: number; pending: number };
  listings: { published: number; pending: number; rejected: number; demo: number };
  inquiries: { total: number; last7Days: number };
  openReports: number;
}

export interface AdminReviewQueueDto {
  listings: (ListingSummaryDto & { ownerEmail: string; submittedAt: string; regulated: boolean })[];
  providers: (ProviderDto & { ownerEmail: string })[];
  credentials: (CredentialDto & { providerId: string; businessName: string })[];
  reviews: (ReviewDto & { listingId: string; listingTitle: string })[];
}

export interface ProviderDashboardDto {
  provider: ProviderDto;
  listings: (ListingSummaryDto & { status: ListingStatus; rejectionReason: string | null; inquiryCount: number })[];
  stats: { activeListings: number; pendingListings: number; newInquiries: number; totalInquiries: number };
}

export type AiIntent = {
  categorySlug: string | null;
  query: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  radiusMiles: number | null;
  language: string | null;
  maxPrice: number | null;
  transactionType: TransactionType | null;
  timeframe: "today" | "this_weekend" | "this_week" | "this_month" | null;
};

export interface AiChatResponseDto {
  conversationId: string;
  reply: string;
  intent: AiIntent | null;
  results: ListingSummaryDto[];
  /** Links to run the same search on the website. */
  searchUrl: string | null;
  safety: { type: "emergency" | "crisis" | "regulated" | "out_of_scope"; message: string } | null;
  suggestions: string[];
  usage: { remainingToday: number };
}
