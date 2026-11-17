import type { Metadata } from "next";
import { Briefcase, Car, FileBadge, Gavel, GraduationCap, House, PlaneLanding, Scale, Users } from "lucide-react";
import { ProSection, TONES, type ProSectionConfig } from "@/components/pro-section";

export const metadata: Metadata = { title: "Attorneys" };

const CONFIG: ProSectionConfig = {
  path: "/attorneys",
  title: "Attorneys",
  icon: Scale,
  blurb: "Immigration, family, business and real estate lawyers who understand the community, many speaking Hindi, Urdu, Telugu or Tamil.",
  countNoun: "attorneys listed",
  areaHeading: "What do you need help with?",
  areaLabel: "Practice area",
  aiPrompt: "Find an H-1B immigration attorney near me",
  listCta: "List your practice",
  alertTopic: "attorneys",
  license: {
    lead: "Check the bar license.",
    body: "\u201cVerified\u201d means we reviewed the attorney\u2019s bar admission. You can also look anyone up on the",
    linkLabel: "State Bar of Texas website (Find a Lawyer)",
    href: "https://www.texasbar.com/",
  },
  areas: [
    { key: "", label: "All attorneys", category: "lawyers,immigration", hint: "Every practice area", icon: Scale, tone: TONES.peacock },
    { key: "immigration", label: "Immigration", category: "immigration", hint: "Visas, green cards, citizenship", icon: PlaneLanding, tone: TONES.haldi },
    { key: "work-visas", label: "Work visas", category: "work-visas", hint: "H-1B, L-1, O-1", icon: Briefcase, tone: TONES.haldi },
    { key: "green-cards", label: "Green cards", category: "green-cards", hint: "PERM, EB-2, EB-3", icon: FileBadge, tone: TONES.leaf },
    { key: "students", label: "Student visas", category: "students", hint: "F-1, OPT, STEM OPT", icon: GraduationCap, tone: TONES.peacock },
    { key: "family-law", label: "Family law", category: "family-law", hint: "Divorce, custody", icon: Users, tone: TONES.kumkum },
    { key: "business-law", label: "Business law", category: "business-law", hint: "LLCs, contracts", icon: Briefcase, tone: TONES.peacock },
    { key: "real-estate-law", label: "Real estate law", category: "real-estate-law", hint: "Closings, leases", icon: House, tone: TONES.leaf },
    { key: "criminal-defense", label: "Criminal defense", category: "criminal-defense", hint: "Charges, DWI", icon: Gavel, tone: TONES.kumkum },
    { key: "personal-injury", label: "Personal injury", category: "personal-injury", hint: "Accidents, claims", icon: Car, tone: TONES.haldi },
  ],
};

export default function AttorneysPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <ProSection config={CONFIG} searchParams={searchParams} />;
}
