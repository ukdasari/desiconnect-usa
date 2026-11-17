import type { Metadata } from "next";
import { Activity, Baby, Brain, Eye, Flower2, HeartPulse, Leaf, Pill, Smile, Stethoscope } from "lucide-react";
import { ProSection, TONES, type ProSectionConfig } from "@/components/pro-section";

export const metadata: Metadata = { title: "Medical" };

const CONFIG: ProSectionConfig = {
  path: "/medical",
  title: "Medical",
  icon: Stethoscope,
  blurb: "Doctors, dentists, therapists and clinics who understand the community, many speaking Hindi, Telugu, Tamil, Gujarati or Urdu.",
  countNoun: "providers listed",
  areaHeading: "What kind of care do you need?",
  areaLabel: "Medical specialty",
  aiPrompt: "Find a Hindi-speaking pediatrician near me",
  listCta: "List your practice",
  alertTopic: "medical",
  notePrefix: "In an emergency, call 911.",
  license: {
    lead: "Check the license.",
    body: "“Verified” means we reviewed the provider’s medical or professional license. You can look up Texas doctors on the",
    linkLabel: "Texas Medical Board website",
    href: "https://www.tmb.state.tx.us/",
  },
  areas: [
    { key: "", label: "All medical", category: "healthcare", hint: "Every specialty", icon: Stethoscope, tone: TONES.peacock },
    { key: "primary-care", label: "Primary care", category: "primary-care", hint: "Family doctors, checkups", icon: HeartPulse, tone: TONES.kumkum },
    { key: "pediatrics", label: "Pediatrics", category: "pediatrics", hint: "Children's doctors", icon: Baby, tone: TONES.haldi },
    { key: "dentists", label: "Dentists", category: "dentists", hint: "Cleanings, braces, implants", icon: Smile, tone: TONES.peacock },
    { key: "womens-health", label: "Women's health", category: "womens-health", hint: "OB-GYN, pregnancy", icon: Flower2, tone: TONES.kumkum },
    { key: "mental-health", label: "Mental health", category: "mental-health", hint: "Therapy, counseling", icon: Brain, tone: TONES.leaf },
    { key: "eye-care", label: "Eye care", category: "eye-care", hint: "Eye exams, glasses", icon: Eye, tone: TONES.peacock },
    { key: "physical-therapy", label: "Physical therapy", category: "physical-therapy", hint: "Injury, rehab", icon: Activity, tone: TONES.haldi },
    { key: "ayurveda", label: "Ayurveda & wellness", category: "ayurveda", hint: "Ayurveda, yoga, nutrition", icon: Leaf, tone: TONES.leaf },
    { key: "pharmacies", label: "Pharmacies", category: "pharmacies", hint: "Prescriptions, vaccines", icon: Pill, tone: TONES.kumkum },
  ],
};

export default function MedicalPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <ProSection config={CONFIG} searchParams={searchParams} />;
}
