// Rule-based intent parsing for Desi AI. Pure functions (no I/O) so they are easy to test.
// An LLM provider may refine the intent, but safety detection always runs here first.
import { LANGUAGES, US_STATES, type AiIntent, type TransactionType } from "@desiconnect/contracts";

export type SafetyFlag = NonNullable<import("@desiconnect/contracts").AiChatResponseDto["safety"]>;

export interface ParseContext {
  knownCities: { city: string; state: string }[];
  /** Location supplied by the client (selector) or from the user's profile. */
  defaultLocation?: { city?: string | null; state?: string | null; zip?: string | null } | null;
  now?: Date;
}

export interface ParsedIntent extends AiIntent {
  from: Date | null;
  to: Date | null;
  /** True when the user explicitly asked for a nationwide search ("in the USA", "remote"). */
  nationwide: boolean;
  /** Location came from defaults rather than the message. */
  usedDefaultLocation: boolean;
  guidance: "new_arrival" | null;
}

// ---------------------------------------------------------------- safety

/** "911"/"emergency" alone may be a service search ("emergency plumber"); these phrases never are. */
const WEAK_EMERGENCY_RE = /\b(911|emergency)\b/i;
const EMERGENCY_RE =
  /\b(heart attack|stroke|can'?t breathe|not breathing|unconscious|severe bleeding|bleeding (a lot|heavily)|overdos(e|ed|ing)|house (is )?on fire|fire in|car (crash|accident)|being attacked|someone (broke|is breaking) in|poison(ed|ing)?)\b/i;
const CRISIS_RE =
  /\b(suicid(e|al)|kill (myself|me)|end (my|it all|my life)|want to die|self[- ]?harm|hurt(ing)? myself|no reason to live)\b/i;

export function detectSafety(message: string): SafetyFlag | null {
  if (CRISIS_RE.test(message)) {
    return {
      type: "crisis",
      message:
        "If you are thinking about suicide or are in emotional distress, call or text 988 (Suicide & Crisis Lifeline) right now — it is free, confidential and available 24/7. If you are in immediate danger, call 911.",
    };
  }
  if (EMERGENCY_RE.test(message) || (WEAK_EMERGENCY_RE.test(message) && !detectCategory(message))) {
    return {
      type: "emergency",
      message: "If this is an emergency or someone is in danger, call 911 now. I can't contact emergency services for you.",
    };
  }
  return null;
}

// ---------------------------------------------------------------- category detection

/** Ordered: the first matching rule wins, so specific phrases come before generic ones. */
const CATEGORY_RULES: [RegExp, string][] = [
  // insurance before real estate ("home insurance") and healthcare ("health insurance")
  [/\b(visitor|parents?'?)\s+(medical\s+)?insurance\b/i, "visitor-insurance"],
  [/\b(home|homeowners?|renters?)\s+insurance\b/i, "home-insurance"],
  [/\b(auto|car|vehicle)\s+insurance\b/i, "auto-insurance"],
  [/\blife\s+insurance\b/i, "life-insurance"],
  [/\bhealth\s+insurance\b/i, "health-insurance"],
  [/\binsurance\b/i, "insurance"],
  // immigration before lawyers ("immigration attorney")
  [/\b(green\s?card|perm)\b/i, "green-cards"],
  [/\b(h-?1b|l-?1|work visa)\b/i, "work-visas"],
  [/\b(citizenship|naturali[sz]ation|n-?400)\b/i, "citizenship"],
  [/\b(f-?1|opt|student visa)\b/i, "students"],
  [/\b(immigration|visa)\b/i, "immigration"],
  [/\b(family|divorce|custody|prenup)\w*\s+(law|lawyer|attorney)/i, "family-law"],
  [/\b(lawyer|attorney|legal help|law firm)s?\b/i, "lawyers"],
  // finance
  [/\bmortgage\b/i, "mortgage"],
  [/\b(cpa|accountant|bookkeep\w*)\b/i, "cpa"],
  [/\btax(es)?\b/i, "tax-preparation"],
  [/\bfinancial (planner|advisor|planning)\b/i, "financial-planning"],
  // food
  [/\bcater(ing|er|ers)?\b/i, "catering"],
  [/\btiffin\b/i, "tiffin"],
  [/\b(sweets?|mithai|bakery)\b/i, "sweets-bakery"],
  [/\b(restaurant|biryani|dosa|food)\b/i, "food"],
  // home services
  [/\b(hvac|a\/?c repair|ac (is )?(not|broken)|air condition\w*|furnace|heating)\b/i, "hvac"],
  [/\bplumb\w*\b/i, "plumbing"],
  [/\belectric(ian|al)\b/i, "electrical"],
  [/\b(clean(ing|er|ers)|maid)\b/i, "cleaning"],
  [/\b(handyman|repairs?)\b/i, "handyman"],
  // healthcare
  [/\bdentist|dental\b/i, "dentists"],
  [/\bpediatric\w*\b/i, "pediatrics"],
  [/\b(therapist|therapy|counsel(or|ing)|mental health|psychiatrist)\b/i, "mental-health"],
  [/\bayurved\w*\b/i, "ayurveda"],
  [/\b(doctor|physician|clinic|primary care|gp)\b/i, "healthcare"],
  // real estate
  [/\broommates?\b/i, "roommates"],
  [/\b(for sale|buy (a )?(house|home|condo|townhouse))\b/i, "for-sale"],
  [/\b(rent(al|ing)?|lease|apartment|house for rent|home for rent)\b/i, "rentals"],
  [/\b(house|home|condo|townhouse|real estate|realtor)s?\b/i, "real-estate"],
  // jobs
  [/\b(jobs?|hiring|career|openings?|positions?|sdet|developer|engineer|nurse|accountant job|internship)\b/i, "jobs"],
  // events
  [/\b(concert|music night|recital)\b/i, "concerts"],
  [/\b(networking|meetup)\b/i, "networking"],
  [/\b(events?|festival|diwali|holi|garba|navratri|dandiya|mela|things to do|what'?s happening)\b/i, "events"],
  // education
  [/\b(tutor\w*|sat prep|math help)\b/i, "tutoring"],
  [/\b(bharatanatyam|kuchipudi|kathak|dance class|music class|carnatic|hindustani)\b/i, "music-dance"],
  [/\b(selenium|playwright|it training|coding class|bootcamp)\b/i, "it-training"],
  [/\b(class(es)?|course|training)\b/i, "education"],
  // shopping
  [/\b(grocer(y|ies)|indian store|spices)\b/i, "grocery"],
  [/\b(saree|sari|lehenga|kurta|sherwani|ethnic wear)s?\b/i, "clothing"],
  [/\bjewel(le)?ry\b/i, "jewelry"],
  [/\b(puja|pooja) (items|samagri)\b/i, "puja-items"],
  // travel
  [/\b(movers?|moving company|relocat\w*)\b/i, "movers"],
  [/\bairport (ride|pickup|drop)\b/i, "airport-rides"],
  [/\b(travel agent|flights?|air tickets?|tour package)\b/i, "travel-agents"],
  [/\b(passport|oci|visa services)\b/i, "visa-services"],
  // community
  [/\b(temple|mandir|gurudwara|mosque|church)s?\b/i, "temples"],
  [/\bvolunteer\w*\b/i, "volunteering"],
  [/\b(association|community group|organization|sangam|samaj)\b/i, "organizations"],
];

const TOP_LEVEL: Record<string, string> = {
  "visitor-insurance": "insurance", "home-insurance": "insurance", "auto-insurance": "insurance", "life-insurance": "insurance", "health-insurance": "insurance",
  "green-cards": "immigration", "work-visas": "immigration", citizenship: "immigration", students: "immigration",
  "family-law": "lawyers", mortgage: "finance-taxes", cpa: "finance-taxes", "tax-preparation": "finance-taxes", "financial-planning": "finance-taxes",
  catering: "food", tiffin: "food", "sweets-bakery": "food", hvac: "home-services", plumbing: "home-services", electrical: "home-services",
  cleaning: "home-services", handyman: "home-services", dentists: "healthcare", pediatrics: "healthcare", "mental-health": "healthcare", ayurveda: "healthcare",
  roommates: "real-estate", "for-sale": "real-estate", rentals: "real-estate", concerts: "events", networking: "events",
  tutoring: "education", "music-dance": "education", "it-training": "education", grocery: "shopping", clothing: "shopping", jewelry: "shopping",
  "puja-items": "shopping", movers: "travel", "airport-rides": "travel", "travel-agents": "travel", "visa-services": "travel",
  temples: "community", volunteering: "community", organizations: "community",
};

export function topLevelOf(slug: string | null): string | null {
  if (!slug) return null;
  return TOP_LEVEL[slug] ?? slug;
}

export function detectCategory(message: string): string | null {
  for (const [re, slug] of CATEGORY_RULES) if (re.test(message)) return slug;
  return null;
}

// ---------------------------------------------------------------- slots

const STOP_WORDS = new Set(
  "a an and are any at best can cheap find for from get good help i in is it looking me my near need nearby of on or please search show some speaking that the there this to top want what where who with within you near me local usa us america united states anywhere nationwide remote jobs job job openings roles role position positions hiring miles mile around".split(" "),
);

const NEW_ARRIVAL_RE = /\b(mov(ed|ing) to (the )?(usa|us|u\.s\.|america|united states)|new (to|in) (the )?(usa|us|america|country)|just (arrived|moved)|new arrival|after moving)\b/i;
const NATIONWIDE_RE = /\b(in|across|anywhere in) (the )?(usa|us|u\.s\.|america|united states|country)\b|\bnationwide\b|\bremote\b/i;

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detectState(message: string): string | null {
  for (const [code, name] of US_STATES) {
    if (new RegExp(`\\b${escapeRe(name)}\\b`, "i").test(message)) return code;
  }
  const m = message.match(/,\s*([A-Z]{2})\b/);
  if (m && US_STATES.some(([c]) => c === m[1])) return m[1]!;
  return null;
}

function detectTimeframe(message: string, now: Date): { timeframe: AiIntent["timeframe"]; from: Date | null; to: Date | null } {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
  if (/\b(today|tonight)\b/i.test(message)) return { timeframe: "today", from: now, to: addDays(startOfDay(now), 1) };
  if (/\bthis weekend\b/i.test(message)) {
    const day = now.getDay(); // 0 Sun .. 6 Sat
    const friday = addDays(startOfDay(now), (5 - day + 7) % 7 || (day === 5 ? 0 : 7));
    const start = day === 6 || day === 0 ? now : friday;
    const sundayEnd = addDays(startOfDay(now), ((7 - day) % 7) + 1);
    return { timeframe: "this_weekend", from: start, to: sundayEnd };
  }
  if (/\bthis week\b/i.test(message)) return { timeframe: "this_week", from: now, to: addDays(startOfDay(now), 7) };
  if (/\bthis month\b/i.test(message)) return { timeframe: "this_month", from: now, to: addDays(startOfDay(now), 31) };
  return { timeframe: null, from: null, to: null };
}

export function parseIntent(message: string, ctx: ParseContext): ParsedIntent {
  const now = ctx.now ?? new Date();
  const categorySlug = detectCategory(message);
  const top = topLevelOf(categorySlug);

  // ---- location
  const zip = message.match(/\b(\d{5})\b(?!\s*(guests|people|sq|sqft|\$|dollars))/i)?.[1] ?? null;
  let city: string | null = null;
  let state: string | null = detectState(message);
  for (const c of ctx.knownCities) {
    if (new RegExp(`\\b${escapeRe(c.city)}\\b`, "i").test(message) && (!state || c.state === state)) {
      city = c.city;
      state ??= c.state;
      break;
    }
  }
  const nationwide = NATIONWIDE_RE.test(message) && !city && !zip;
  let usedDefaultLocation = false;
  let finalCity = city;
  let finalState = state;
  let finalZip = zip;
  if (!city && !zip && !nationwide && !(state && !/\bnear me\b/i.test(message))) {
    const d = ctx.defaultLocation;
    if (d && (d.city || d.zip || d.state)) {
      finalCity = d.city ?? null;
      finalState = d.state ?? state;
      finalZip = d.zip ?? null;
      usedDefaultLocation = true;
    }
  }

  const radius = message.match(/\bwithin\s+(\d{1,3})\s*(mi|miles?)\b/i);
  const radiusMiles = radius ? Math.min(500, Math.max(1, Number(radius[1]))) : null;

  // ---- language (English only counts when explicitly "English-speaking")
  const language =
    LANGUAGES.find((l) => l !== "English" && new RegExp(`\\b${l}\\b`, "i").test(message)) ??
    (/\benglish[- ]speaking\b/i.test(message) ? "English" : null);

  // ---- price
  const price = message.match(/\b(?:under|below|less than|max(?:imum)?|up to|budget(?: of)?)\s*\$?\s*([\d,]+(?:\.\d+)?)\s*(k)?\b/i);
  const maxPrice = price ? Math.round(Number(price[1]!.replace(/,/g, "")) * (price[2] ? 1000 : 1)) : null;

  let transactionType: TransactionType | null = null;
  if (categorySlug === "roommates") transactionType = "ROOMMATE";
  else if (categorySlug === "for-sale") transactionType = "SALE";
  else if (categorySlug === "rentals" || (top === "real-estate" && /\brent/i.test(message))) transactionType = "RENT";

  const { timeframe, from, to } = top === "events" ? detectTimeframe(message, now) : { timeframe: null, from: null, to: null };

  // ---- free-text keywords (jobs use skills/titles; other categories rely on the category filter)
  let query: string | null = null;
  if (top === "jobs" || !categorySlug) {
    const removable = new Set<string>([
      ...(city ? city.toLowerCase().split(" ") : []),
      ...(language ? [language.toLowerCase()] : []),
      ...(state ? [state.toLowerCase(), (US_STATES.find(([c]) => c === state)?.[1] ?? "").toLowerCase()] : []),
    ]);
    const words = message
      .replace(/[^\p{L}\p{N}#+.\- ]/gu, " ")
      .split(/\s+/)
      .map((w) => w.replace(/^[.-]+|[.-]+$/g, ""))
      .filter((w) => w && !STOP_WORDS.has(w.toLowerCase()) && !removable.has(w.toLowerCase()) && !/^\d+$/.test(w) && w.length > 1);
    query = words.length ? words.slice(0, 6).join(" ") : null;
  }

  return {
    categorySlug,
    query,
    city: finalCity,
    state: finalState,
    zip: finalZip,
    radiusMiles,
    language,
    maxPrice,
    transactionType,
    timeframe,
    from,
    to,
    nationwide,
    usedDefaultLocation,
    guidance: NEW_ARRIVAL_RE.test(message) && !categorySlug ? "new_arrival" : null,
  };
}

// ---------------------------------------------------------------- labels

const LABELS: Record<string, string> = {
  events: "upcoming events", concerts: "concerts and shows", networking: "networking events", jobs: "jobs",
  "real-estate": "properties", rentals: "rentals", roommates: "roommate listings", "for-sale": "homes for sale",
  insurance: "insurance agents", lawyers: "lawyers", "family-law": "family lawyers", immigration: "immigration attorneys and services",
  "work-visas": "work-visa attorneys", "green-cards": "green card attorneys", citizenship: "citizenship services", students: "student visa services",
  shopping: "stores", grocery: "Indian grocery stores", clothing: "clothing stores", healthcare: "healthcare providers", dentists: "dentists",
  pediatrics: "pediatricians", "mental-health": "mental health providers", food: "food businesses", catering: "caterers", tiffin: "tiffin services",
  restaurants: "restaurants", travel: "travel services", movers: "movers", "travel-agents": "travel agents", education: "education providers",
  tutoring: "tutors", "music-dance": "music and dance classes", "it-training": "IT training providers", "home-services": "home service pros",
  hvac: "HVAC companies", plumbing: "plumbers", cleaning: "cleaning services", "finance-taxes": "finance and tax professionals",
  "tax-preparation": "tax preparers", cpa: "CPAs", mortgage: "mortgage professionals", community: "community organizations",
  temples: "temples and places of worship", volunteering: "volunteer opportunities", organizations: "community organizations",
};

export function labelFor(slug: string | null): string {
  if (!slug) return "listings";
  return LABELS[slug] ?? LABELS[topLevelOf(slug) ?? ""] ?? "listings";
}

export const REGULATED_TOP_LEVEL = new Set(["lawyers", "immigration", "insurance", "healthcare", "finance-taxes"]);
