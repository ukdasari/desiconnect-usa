import { z } from "zod";

// "Get alerts" topics. Each topic covers one or more categories (a top-level slug includes its subcategories).

export const ALERT_FREQUENCIES = ["INSTANT", "WEEKLY"] as const;
export type AlertFrequency = (typeof ALERT_FREQUENCIES)[number];

export interface AlertTopic {
  key: string;
  label: string;
  /** Category slugs; empty = every category. */
  categories: string[];
  /** What a new alert starts with: instant for time-sensitive topics, weekly digest otherwise. */
  defaultFrequency: AlertFrequency;
  /** Short description for the alert form. */
  hint: string;
}

export const ALERT_TOPICS: AlertTopic[] = [
  { key: "events", label: "Events", categories: ["events"], defaultFrequency: "INSTANT", hint: "Festivals, garba, concerts, meetups" },
  { key: "jobs", label: "Jobs", categories: ["jobs"], defaultFrequency: "INSTANT", hint: "New job postings" },
  { key: "restaurants", label: "Restaurants", categories: ["restaurants"], defaultFrequency: "WEEKLY", hint: "New Indian and Pakistani restaurants" },
  { key: "attorneys", label: "Attorneys", categories: ["lawyers", "immigration"], defaultFrequency: "WEEKLY", hint: "Immigration, family and business lawyers" },
  { key: "real-estate", label: "Real estate", categories: ["real-estate"], defaultFrequency: "WEEKLY", hint: "Rentals, homes for sale, roommates" },
  { key: "everything", label: "Everything new", categories: [], defaultFrequency: "WEEKLY", hint: "All new listings in your area" },
];

export const ALERT_TOPIC_KEYS = ALERT_TOPICS.map((t) => t.key) as [string, ...string[]];
export const getAlertTopic = (key: string) => ALERT_TOPICS.find((t) => t.key === key);
export const MAX_ALERTS_PER_USER = 20;

/** Does a listing in `categorySlug` (with parent `parentSlug`) match the topic? */
export function topicMatches(topic: AlertTopic, categorySlug: string, parentSlug?: string | null): boolean {
  if (!topic.categories.length) return true;
  return topic.categories.includes(categorySlug) || (!!parentSlug && topic.categories.includes(parentSlug));
}

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const createAlertSchema = z.object({
  topic: z.enum(ALERT_TOPIC_KEYS, { message: "Choose what to be alerted about" }),
  city: optional(80),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Use a 2-letter state code")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  zip: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "Use a 5-digit ZIP code")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  radiusMiles: z.coerce.number().int().min(5).max(250).default(25),
  frequency: z.enum(ALERT_FREQUENCIES).optional(),
});
export type CreateAlertInput = z.input<typeof createAlertSchema>;

export const updateAlertSchema = z.object({ frequency: z.enum(ALERT_FREQUENCIES) });

export const notificationSettingsSchema = z.object({
  alertEmails: z.boolean().optional(),
  alertPush: z.boolean().optional(),
});

export interface AlertDto {
  id: string;
  topic: string;
  topicLabel: string;
  locationLabel: string | null;
  radiusMiles: number;
  frequency: AlertFrequency;
  createdAt: string;
}

export interface NotificationSettingsDto {
  alertEmails: boolean;
  alertPush: boolean;
  email: string;
}
