import type { Metadata } from "next";
import { Baby, BookOpen, Cpu, Flower2, Languages, Music, Sun, Trophy, Waves, Users } from "lucide-react";
import { ProSection, TONES, type ProSectionConfig } from "@/components/pro-section";

export const metadata: Metadata = { title: "Kids & Family" };

const CONFIG: ProSectionConfig = {
  path: "/kids",
  title: "Kids & Family",
  icon: Baby,
  blurb: "Cricket academies, sports, Bharatanatyam and music, Hindi and Telugu classes, tutoring, camps and childcare: everything for your kids across Dallas–Fort Worth.",
  countNoun: "kids' programs listed",
  areaHeading: "What are you looking for?",
  areaLabel: "Kids activity",
  aiPrompt: "Find a Bharatanatyam class and a cricket academy for my 8-year-old near Frisco",
  listCta: "List your program",
  alertTopic: "kids",
  license: {
    lead: "Keep kids safe.",
    body: "Ask coaches, tutors and nannies about background checks. Daycares and after-school programs in Texas must be licensed, and you can check any of them on the",
    linkLabel: "Texas Health and Human Services website (child care search)",
    href: "https://www.hhs.texas.gov/",
  },
  relatedLabel: "Also for families:",
  related: [
    { href: "/medical?area=pediatrics", label: "Pediatricians" },
    { href: "/events?category=kids-family", label: "Family events" },
    { href: "/event-management", label: "Birthday party vendors" },
    { href: "/medical?area=dentists", label: "Kids' dentists" },
  ],
  areas: [
    { key: "", label: "All kids' programs", category: "kids,music-dance,languages,tutoring", hint: "Everything for kids", icon: Baby, tone: TONES.peacock },
    { key: "cricket-academies", label: "Cricket", category: "cricket-academies", hint: "Academies, coaching, leagues", icon: Trophy, tone: TONES.leaf },
    { key: "kids-sports", label: "Sports & swimming", category: "kids-sports", hint: "Soccer, badminton, martial arts", icon: Waves, tone: TONES.peacock },
    { key: "music-dance", label: "Dance & music", category: "music-dance", hint: "Bharatanatyam, Carnatic, tabla", icon: Music, tone: TONES.kumkum },
    { key: "languages", label: "Language classes", category: "languages", hint: "Hindi, Telugu, Tamil, Urdu", icon: Languages, tone: TONES.haldi },
    { key: "tutoring", label: "Tutoring & test prep", category: "tutoring", hint: "Math, reading, SAT", icon: BookOpen, tone: TONES.peacock },
    { key: "chess-stem", label: "Chess & coding", category: "chess-stem", hint: "Chess, coding, robotics", icon: Cpu, tone: TONES.leaf },
    { key: "bal-vihar", label: "Culture & Bal Vihar", category: "bal-vihar", hint: "Shlokas, values, festivals", icon: Flower2, tone: TONES.haldi },
    { key: "camps", label: "Camps", category: "camps", hint: "Summer, winter, spring break", icon: Sun, tone: TONES.haldi },
    { key: "childcare", label: "Daycare & nannies", category: "childcare", hint: "Daycare, after-school, nannies", icon: Users, tone: TONES.kumkum },
  ],
};

export default function KidsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <ProSection config={CONFIG} searchParams={searchParams} />;
}
