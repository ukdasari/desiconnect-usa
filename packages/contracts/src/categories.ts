import type { CredentialType, ListingKind } from "./enums";

export interface SubcategoryDefinition {
  slug: string;
  name: string;
}

export interface CategoryDefinition {
  slug: string;
  name: string;
  /** Short line shown on category cards. */
  tagline: string;
  /** Icon name from lucide (https://lucide.dev). Rendered by the web and mobile apps. */
  icon: string;
  /** The listing shape used in this category. */
  kind: ListingKind;
  /**
   * Regulated categories (legal, insurance, medical, tax) must show license/verification
   * information and a disclaimer; listings are always reviewed before publishing.
   */
  regulated: boolean;
  /** Credential types a provider in this category is expected to submit. */
  expectedCredentials: CredentialType[];
  subcategories: SubcategoryDefinition[];
}

/** The 15 primary categories. Seeded into the `categories` table; slugs are stable identifiers. */
export const CATEGORIES: CategoryDefinition[] = [
  {
    slug: "events",
    name: "Events",
    tagline: "Festivals, concerts, cultural and community events",
    icon: "calendar-heart",
    kind: "EVENT",
    regulated: false,
    expectedCredentials: [],
    subcategories: [
      { slug: "festivals", name: "Festivals" },
      { slug: "concerts", name: "Concerts & Shows" },
      { slug: "religious", name: "Religious & Spiritual" },
      { slug: "networking", name: "Networking" },
      { slug: "kids-family", name: "Kids & Family" },
    ],
  },
  {
    slug: "jobs",
    name: "Jobs",
    tagline: "Find work or hire from the community",
    icon: "briefcase",
    kind: "JOB",
    regulated: false,
    expectedCredentials: [],
    subcategories: [
      { slug: "technology", name: "Technology" },
      { slug: "healthcare-jobs", name: "Healthcare" },
      { slug: "retail-hospitality", name: "Retail & Hospitality" },
      { slug: "finance-jobs", name: "Finance & Accounting" },
      { slug: "other-jobs", name: "Other" },
    ],
  },
  {
    slug: "real-estate",
    name: "Real Estate",
    tagline: "Rentals, homes for sale and roommates",
    icon: "home",
    kind: "PROPERTY",
    regulated: false,
    expectedCredentials: ["REAL_ESTATE_LICENSE"],
    subcategories: [
      { slug: "rentals", name: "Rentals" },
      { slug: "for-sale", name: "For Sale" },
      { slug: "roommates", name: "Roommates" },
      { slug: "commercial", name: "Commercial" },
    ],
  },
  {
    slug: "insurance",
    name: "Insurance",
    tagline: "Licensed agents for auto, home, health and life",
    icon: "shield-check",
    kind: "SERVICE",
    regulated: true,
    expectedCredentials: ["INSURANCE_LICENSE"],
    subcategories: [
      { slug: "auto-insurance", name: "Auto" },
      { slug: "home-insurance", name: "Home & Renters" },
      { slug: "health-insurance", name: "Health" },
      { slug: "life-insurance", name: "Life" },
      { slug: "visitor-insurance", name: "Visitor / Parents" },
    ],
  },
  {
    slug: "lawyers",
    name: "Lawyers",
    tagline: "Attorneys for family, business, real estate and more",
    icon: "scale",
    kind: "SERVICE",
    regulated: true,
    expectedCredentials: ["BAR_ADMISSION"],
    subcategories: [
      { slug: "family-law", name: "Family Law" },
      { slug: "business-law", name: "Business Law" },
      { slug: "real-estate-law", name: "Real Estate Law" },
      { slug: "criminal-defense", name: "Criminal Defense" },
      { slug: "personal-injury", name: "Personal Injury" },
    ],
  },
  {
    slug: "immigration",
    name: "Immigration",
    tagline: "Immigration attorneys and trusted resources",
    icon: "plane-landing",
    kind: "SERVICE",
    regulated: true,
    expectedCredentials: ["BAR_ADMISSION"],
    subcategories: [
      { slug: "work-visas", name: "Work Visas (H-1B, L-1)" },
      { slug: "green-cards", name: "Green Cards" },
      { slug: "family-immigration", name: "Family Immigration" },
      { slug: "citizenship", name: "Citizenship" },
      { slug: "students", name: "Student Visas" },
    ],
  },
  {
    slug: "shopping",
    name: "Shopping",
    tagline: "Grocery, clothing, jewelry and specialty stores",
    icon: "shopping-bag",
    kind: "SERVICE",
    regulated: false,
    expectedCredentials: ["BUSINESS_LICENSE"],
    subcategories: [
      { slug: "grocery", name: "Grocery" },
      { slug: "clothing", name: "Clothing & Sarees" },
      { slug: "jewelry", name: "Jewelry" },
      { slug: "puja-items", name: "Puja Items" },
    ],
  },
  {
    slug: "emergency",
    name: "Emergency",
    tagline: "911, 988 and non-emergency help",
    icon: "siren",
    kind: "RESOURCE",
    regulated: false,
    expectedCredentials: [],
    subcategories: [
      { slug: "crisis-lines", name: "Crisis Lines" },
      { slug: "community-help", name: "Community Help" },
      { slug: "consulate", name: "Consulate Services" },
    ],
  },
  {
    slug: "healthcare",
    name: "Healthcare",
    tagline: "Doctors and clinics by specialty and language",
    icon: "stethoscope",
    kind: "SERVICE",
    regulated: true,
    expectedCredentials: ["MEDICAL_LICENSE"],
    subcategories: [
      { slug: "primary-care", name: "Primary Care" },
      { slug: "pediatrics", name: "Pediatrics" },
      { slug: "dentists", name: "Dentists" },
      { slug: "mental-health", name: "Mental Health" },
      { slug: "ayurveda", name: "Ayurveda & Wellness" },
    ],
  },
  {
    slug: "food",
    name: "Food",
    tagline: "Restaurants, catering and tiffin services",
    icon: "utensils",
    kind: "SERVICE",
    regulated: false,
    expectedCredentials: ["BUSINESS_LICENSE"],
    subcategories: [
      { slug: "restaurants", name: "Restaurants" },
      { slug: "catering", name: "Catering" },
      { slug: "tiffin", name: "Tiffin Services" },
      { slug: "sweets-bakery", name: "Sweets & Bakery" },
    ],
  },
  {
    slug: "travel",
    name: "Travel",
    tagline: "Travel agents, rides and moving services",
    icon: "plane",
    kind: "SERVICE",
    regulated: false,
    expectedCredentials: ["BUSINESS_LICENSE"],
    subcategories: [
      { slug: "travel-agents", name: "Travel Agents" },
      { slug: "airport-rides", name: "Airport Rides" },
      { slug: "movers", name: "Movers" },
      { slug: "visa-services", name: "Visa & Passport Services" },
    ],
  },
  {
    slug: "education",
    name: "Education",
    tagline: "Tutors, classes and training providers",
    icon: "graduation-cap",
    kind: "SERVICE",
    regulated: false,
    expectedCredentials: [],
    subcategories: [
      { slug: "tutoring", name: "Tutoring" },
      { slug: "music-dance", name: "Music & Dance" },
      { slug: "languages", name: "Language Classes" },
      { slug: "it-training", name: "IT Training" },
    ],
  },
  {
    slug: "home-services",
    name: "Home Services",
    tagline: "HVAC, plumbing, cleaning and repairs",
    icon: "wrench",
    kind: "SERVICE",
    regulated: false,
    expectedCredentials: ["CONTRACTOR_LICENSE"],
    subcategories: [
      { slug: "hvac", name: "HVAC" },
      { slug: "plumbing", name: "Plumbing" },
      { slug: "electrical", name: "Electrical" },
      { slug: "cleaning", name: "Cleaning" },
      { slug: "handyman", name: "Handyman & Repairs" },
    ],
  },
  {
    slug: "finance-taxes",
    name: "Finance & Taxes",
    tagline: "CPAs, tax preparers and financial planners",
    icon: "landmark",
    kind: "SERVICE",
    regulated: true,
    expectedCredentials: ["CPA_LICENSE"],
    subcategories: [
      { slug: "tax-preparation", name: "Tax Preparation" },
      { slug: "cpa", name: "CPAs & Accounting" },
      { slug: "financial-planning", name: "Financial Planning" },
      { slug: "mortgage", name: "Mortgage" },
    ],
  },
  {
    slug: "community",
    name: "Community",
    tagline: "Organizations, temples, announcements and volunteering",
    icon: "users",
    kind: "SERVICE",
    regulated: false,
    expectedCredentials: [],
    subcategories: [
      { slug: "organizations", name: "Organizations" },
      { slug: "temples", name: "Temples & Places of Worship" },
      { slug: "volunteering", name: "Volunteering" },
      { slug: "announcements", name: "Announcements" },
    ],
  },
];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);

export function getCategory(slug: string): CategoryDefinition | undefined {
  return CATEGORIES.find((c) => c.slug === slug || c.subcategories.some((s) => s.slug === slug));
}

/** Disclaimer shown on regulated listings. Not legal advice; reviewed wording should replace this before launch. */
export const REGULATED_DISCLAIMER =
  "DesiConnect USA is a directory and does not provide legal, insurance, medical or tax advice. " +
  "Verify a professional's license with the issuing state authority before engaging their services.";
