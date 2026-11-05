// Icons and colours for restaurant cuisines and features, shared by the Restaurants page tiles and the restaurant cards.
import {
  BadgeCheck,
  ChefHat,
  CookingPot,
  Crown,
  Flame,
  Leaf,
  Mountain,
  Salad,
  ShoppingBag,
  Shuffle,
  Soup,
  Sparkles,
  Store,
  Truck,
  UtensilsCrossed,
  Wheat,
  type LucideIcon,
} from "lucide-react";

export interface CuisineStyle {
  icon: LucideIcon;
  /** Soft background + text colour for icon bubbles and badges. */
  tone: string;
  /** Gradient for the top of a restaurant card. */
  band: string;
}

const PEACOCK = { tone: "bg-peacock-soft text-peacock-2 dark:text-marigold", band: "from-peacock to-peacock-2" };
const SAFFRON = { tone: "bg-haldi text-marigold-strong", band: "from-[#b86a05] to-marigold" };
const CHILLI = { tone: "bg-kumkum-soft text-kumkum", band: "from-[#8f2520] to-kumkum" };
const LEAF = { tone: "bg-leaf-soft text-leaf", band: "from-[#135a3b] to-leaf" };

/** Feature tags, in the order badges are shown. */
export const TAG_STYLES: Record<string, CuisineStyle> = {
  Halal: { icon: BadgeCheck, ...LEAF },
  Vegetarian: { icon: Leaf, ...LEAF },
  Vegan: { icon: Salad, ...LEAF },
  "South Indian": { icon: Soup, ...SAFFRON },
  Hyderabadi: { icon: Crown, ...SAFFRON },
  Biryani: { icon: CookingPot, ...CHILLI },
  BBQ: { icon: Flame, ...CHILLI },
  Punjabi: { icon: Wheat, ...SAFFRON },
  Nepali: { icon: Mountain, ...PEACOCK },
  Afghan: { icon: Mountain, ...PEACOCK },
  "Street food": { icon: Store, ...PEACOCK },
  "Food truck": { icon: Truck, ...PEACOCK },
  "Fine dining": { icon: Sparkles, ...SAFFRON },
  Fusion: { icon: Shuffle, ...PEACOCK },
  "Indo-Chinese": { icon: Shuffle, ...PEACOCK },
  "Takeout only": { icon: ShoppingBag, ...PEACOCK },
};

const CUISINE_STYLES: Record<string, CuisineStyle> = {
  Pakistani: { icon: Flame, ...CHILLI },
  "South Indian": { icon: Soup, ...SAFFRON },
  Vegetarian: { icon: Leaf, ...LEAF },
  Indian: { icon: ChefHat, ...SAFFRON },
};
const DEFAULT_STYLE: CuisineStyle = { icon: UtensilsCrossed, ...PEACOCK };

/** "Indian", "Pakistani" or "Indian & Pakistani" from a restaurant's tags. */
export function cuisineLabel(tags: string[]): string | null {
  const indian = tags.includes("Indian");
  const pakistani = tags.includes("Pakistani");
  if (indian && pakistani) return "Indian & Pakistani";
  if (pakistani) return "Pakistani";
  if (indian) return tags.includes("South Indian") ? "South Indian" : "Indian";
  return null;
}

/** The icon and colours that best describe a restaurant (most specific tag first). */
export function cuisineStyle(tags: string[]): CuisineStyle {
  for (const key of ["Pakistani", "South Indian", "Vegetarian", "Indian"]) if (tags.includes(key)) return CUISINE_STYLES[key]!;
  return DEFAULT_STYLE;
}

/** Feature badges for a card (cuisine words themselves are shown separately). */
export function featureTags(tags: string[]): { label: string; style: CuisineStyle }[] {
  return Object.entries(TAG_STYLES)
    .filter(([label]) => tags.includes(label))
    .map(([label, style]) => ({ label, style }));
}
