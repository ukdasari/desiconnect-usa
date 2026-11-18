import type { Metadata } from "next";
import { Camera, ClipboardCheck, Flower2, Hand, Landmark, Music, PartyPopper, Sparkles, Utensils, Flame } from "lucide-react";
import { ProSection, TONES, type ProSectionConfig } from "@/components/pro-section";

export const metadata: Metadata = { title: "Event Management" };

const CONFIG: ProSectionConfig = {
  path: "/event-management",
  title: "Event Management",
  icon: PartyPopper,
  blurb: "Everyone who makes a wedding, sangeet, pooja or birthday happen: planners, decorators, caterers, DJs, photographers, mehndi artists, venues and priests.",
  countNoun: "event vendors listed",
  areaHeading: "What does your event need?",
  areaLabel: "Event service",
  aiPrompt: "Find a decorator and a DJ for a sangeet for 200 guests in Frisco",
  listCta: "List your business",
  alertTopic: "event-services",
  license: {
    lead: "Book with confidence.",
    body: "Get a written quote and contract, ask what the deposit covers, and check recent reviews. For venues and caterers, ask about permits and insurance. Questions about a vendor? Read our",
    linkLabel: "terms of service",
    href: "/terms",
  },
  areas: [
    { key: "", label: "All event services", category: "event-services,catering", hint: "Every vendor", icon: PartyPopper, tone: TONES.peacock },
    { key: "event-planners", label: "Event planners", category: "event-planners", hint: "Full planning, day-of", icon: ClipboardCheck, tone: TONES.haldi },
    { key: "decor", label: "Decor & mandap", category: "decor", hint: "Stage, flowers, rentals", icon: Flower2, tone: TONES.kumkum },
    { key: "catering", label: "Catering", category: "catering", hint: "Menus, live stations", icon: Utensils, tone: TONES.leaf },
    { key: "photo-video", label: "Photo & video", category: "photo-video", hint: "Photography, films", icon: Camera, tone: TONES.peacock },
    { key: "djs-music", label: "DJs & music", category: "djs-music", hint: "DJ, dhol, live bands", icon: Music, tone: TONES.haldi },
    { key: "mehndi", label: "Mehndi artists", category: "mehndi", hint: "Bridal, party henna", icon: Hand, tone: TONES.leaf },
    { key: "bridal-makeup", label: "Bridal makeup", category: "bridal-makeup", hint: "Makeup, hair, draping", icon: Sparkles, tone: TONES.kumkum },
    { key: "venues", label: "Venues", category: "venues", hint: "Banquet halls, outdoor", icon: Landmark, tone: TONES.peacock },
    { key: "priests", label: "Priests & pandits", category: "priests", hint: "Pooja, weddings, havan", icon: Flame, tone: TONES.haldi },
  ],
};

export default function EventManagementPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <ProSection config={CONFIG} searchParams={searchParams} />;
}
