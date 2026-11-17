import type { Metadata } from "next";
import { Building2, ClipboardList, Gem, Hammer, House, Key, KeyRound, Tag, TrendingUp, Truck } from "lucide-react";
import { ProSection, TONES, type ProSectionConfig } from "@/components/pro-section";

export const metadata: Metadata = { title: "Realtors" };

const CONFIG: ProSectionConfig = {
  path: "/realtors",
  title: "Realtors",
  icon: KeyRound,
  blurb: "Licensed real estate agents and brokers for buying, selling, leasing and investing across Dallas–Fort Worth, many speaking Hindi, Telugu, Gujarati or Urdu.",
  countNoun: "realtors listed",
  areaHeading: "How can a realtor help?",
  areaLabel: "Realtor specialty",
  aiPrompt: "Find a Telugu-speaking realtor to help me buy a home in Frisco",
  listCta: "List your business",
  alertTopic: "realtors",
  license: {
    lead: "Check the license.",
    body: "Agents in Texas must be licensed by the Texas Real Estate Commission. “Verified” means we reviewed it. You can look anyone up on the",
    linkLabel: "TREC website (license holder search)",
    href: "https://www.trec.texas.gov/",
  },
  areas: [
    { key: "", label: "All realtors", category: "realtors", hint: "Every specialty", icon: KeyRound, tone: TONES.peacock },
    { key: "home-buying", label: "Buying a home", category: "home-buying", hint: "First home, upsizing", icon: House, tone: TONES.leaf },
    { key: "home-selling", label: "Selling a home", category: "home-selling", hint: "Pricing, listing, staging", icon: Tag, tone: TONES.haldi },
    { key: "leasing-agents", label: "Rentals & leasing", category: "leasing-agents", hint: "Find or lease out a home", icon: Key, tone: TONES.peacock },
    { key: "new-construction", label: "New construction", category: "new-construction", hint: "Builders, new communities", icon: Hammer, tone: TONES.haldi },
    { key: "investment-properties", label: "Investment", category: "investment-properties", hint: "Rental income, multifamily", icon: TrendingUp, tone: TONES.leaf },
    { key: "commercial-realty", label: "Commercial", category: "commercial-realty", hint: "Retail, office, restaurants", icon: Building2, tone: TONES.peacock },
    { key: "property-management", label: "Property management", category: "property-management", hint: "Tenants, upkeep, rent", icon: ClipboardList, tone: TONES.kumkum },
    { key: "relocation", label: "Relocation", category: "relocation", hint: "Moving to DFW", icon: Truck, tone: TONES.haldi },
    { key: "luxury-homes", label: "Luxury homes", category: "luxury-homes", hint: "High-end properties", icon: Gem, tone: TONES.kumkum },
  ],
};

export default function RealtorsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <ProSection config={CONFIG} searchParams={searchParams} />;
}
