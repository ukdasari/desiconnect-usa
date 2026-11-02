import {
  Briefcase,
  CalendarHeart,
  Circle,
  GraduationCap,
  Home,
  Landmark,
  Plane,
  PlaneLanding,
  Scale,
  ShieldCheck,
  ShoppingBag,
  Siren,
  Stethoscope,
  Users,
  Utensils,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { categoryAccent } from "@desiconnect/ui";
import { cn } from "@/lib/cn";

// Explicit map (not a dynamic lookup) so only these icons are bundled.
const ICONS: Record<string, LucideIcon> = {
  "calendar-heart": CalendarHeart,
  briefcase: Briefcase,
  home: Home,
  "shield-check": ShieldCheck,
  scale: Scale,
  "plane-landing": PlaneLanding,
  "shopping-bag": ShoppingBag,
  siren: Siren,
  stethoscope: Stethoscope,
  utensils: Utensils,
  plane: Plane,
  "graduation-cap": GraduationCap,
  wrench: Wrench,
  landmark: Landmark,
  users: Users,
};

export function CategoryIcon({ icon, slug, size = "md", className }: { icon: string; slug: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const Icon = ICONS[icon] ?? Circle;
  const color = categoryAccent[slug] ?? "#15525c";
  const box = { sm: "size-8 rounded-lg", md: "size-11 rounded-xl", lg: "size-14 rounded-2xl" }[size];
  const glyph = { sm: "size-4", md: "size-5", lg: "size-7" }[size];
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center", box, className)}
      style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
      aria-hidden
    >
      <Icon className={glyph} strokeWidth={2} />
    </span>
  );
}
