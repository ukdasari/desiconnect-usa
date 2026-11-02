// Demonstration content. Every business, person and listing here is fictional, flagged `isDemo = true`,
// carries "(Demo)" in its name, and uses example.com / 555 contact details so it can never be mistaken for
// a real provider. Demo license numbers are prefixed "DEMO-" and are not real licenses.

export interface DemoService {
  category: string;
  sub?: string;
  businessName: string;
  title: string;
  description: string;
  city: string;
  languages: string[];
  verification: "VERIFIED" | "PENDING" | "UNVERIFIED";
  credential?: "INSURANCE_LICENSE" | "BAR_ADMISSION" | "MEDICAL_LICENSE" | "CPA_LICENSE" | "CONTRACTOR_LICENSE" | "BUSINESS_LICENSE" | "REAL_ESTATE_LICENSE";
  priceText?: string;
  tags?: string[];
  /** Listing waits in the admin review queue instead of being published. */
  pending?: boolean;
}

export const DEMO_SERVICES: DemoService[] = [
  // Immigration
  {
    category: "immigration", sub: "work-visas", businessName: "Sample Immigration Law Office (Demo)",
    title: "H-1B, L-1 and green card consultations (Demo)",
    description: "Demonstration listing for an immigration attorney offering consultations on work visas, PERM labor certification and family-based green cards. Consultations by phone or video.",
    city: "Frisco", languages: ["English", "Telugu", "Hindi"], verification: "VERIFIED", credential: "BAR_ADMISSION",
    priceText: "Consultation from $150", tags: ["H-1B", "green card", "PERM"],
  },
  {
    category: "immigration", sub: "family-immigration", businessName: "Example Family Immigration Counsel (Demo)",
    title: "Family-based immigration and citizenship help (Demo)",
    description: "Demonstration listing: help with spousal petitions, parent visas, naturalization (N-400) and consular processing. Evening appointments available.",
    city: "Irving", languages: ["English", "Tamil", "Hindi"], verification: "VERIFIED", credential: "BAR_ADMISSION",
    tags: ["citizenship", "N-400", "parents"],
  },
  {
    category: "immigration", sub: "students", businessName: "Demo Student Visa Advisors (Demo)",
    title: "F-1 student visa and OPT guidance (Demo)",
    description: "Demonstration listing for an attorney practice focused on F-1 status, OPT and STEM OPT extensions, and change of status for students.",
    city: "Richardson", languages: ["English", "Telugu", "Kannada"], verification: "PENDING", credential: "BAR_ADMISSION",
    tags: ["OPT", "STEM OPT", "F-1"],
  },
  // Lawyers
  {
    category: "lawyers", sub: "family-law", businessName: "Sample Family Law Practice (Demo)",
    title: "Family law and mediation (Demo)",
    description: "Demonstration listing for a family law attorney: prenuptial agreements, divorce mediation and child custody matters, with culturally aware counsel.",
    city: "Plano", languages: ["English", "Hindi", "Punjabi"], verification: "VERIFIED", credential: "BAR_ADMISSION",
    priceText: "Free 15-minute call",
  },
  {
    category: "lawyers", sub: "business-law", businessName: "Example Business Counsel (Demo)",
    title: "LLC formation, contracts and franchise review (Demo)",
    description: "Demonstration listing for small-business legal services: forming an LLC, reviewing franchise agreements and drafting vendor contracts.",
    city: "Dallas", languages: ["English", "Gujarati"], verification: "VERIFIED", credential: "BAR_ADMISSION",
  },
  // Insurance
  {
    category: "insurance", sub: "auto-insurance", businessName: "Sample Insurance Agency (Demo)",
    title: "Auto, home and renters insurance quotes (Demo)",
    description: "Demonstration listing for a licensed insurance agency comparing auto, home and renters policies from several carriers. Request a quote online.",
    city: "Frisco", languages: ["English", "Telugu"], verification: "VERIFIED", credential: "INSURANCE_LICENSE",
    tags: ["auto", "home", "renters"],
  },
  {
    category: "insurance", sub: "visitor-insurance", businessName: "Example Visitor Coverage (Demo)",
    title: "Visitor insurance for parents visiting from India (Demo)",
    description: "Demonstration listing: help choosing visitor medical insurance for parents and relatives on B-2 visas, including pre-existing condition options.",
    city: "Plano", languages: ["English", "Hindi", "Marathi"], verification: "VERIFIED", credential: "INSURANCE_LICENSE",
    tags: ["visitor", "parents", "B-2"],
  },
  {
    category: "insurance", sub: "life-insurance", businessName: "Demo Life & Health Advisors (Demo)",
    title: "Term life and health insurance planning (Demo)",
    description: "Demonstration listing for term life, whole life and ACA health insurance planning for families.",
    city: "Irving", languages: ["English", "Malayalam"], verification: "PENDING", credential: "INSURANCE_LICENSE",
    pending: true,
  },
  // Healthcare
  {
    category: "healthcare", sub: "primary-care", businessName: "Sample Family Clinic (Demo)",
    title: "Primary care for adults and seniors (Demo)",
    description: "Demonstration listing for a primary care clinic offering annual physicals, chronic condition management and same-week appointments.",
    city: "Plano", languages: ["English", "Hindi", "Telugu"], verification: "VERIFIED", credential: "MEDICAL_LICENSE",
  },
  {
    category: "healthcare", sub: "pediatrics", businessName: "Example Pediatrics (Demo)",
    title: "Pediatric care and vaccinations (Demo)",
    description: "Demonstration listing for a pediatric practice: well-child visits, vaccinations and sick visits for newborns through teens.",
    city: "Frisco", languages: ["English", "Tamil"], verification: "VERIFIED", credential: "MEDICAL_LICENSE",
  },
  {
    category: "healthcare", sub: "dentists", businessName: "Demo Smiles Dental (Demo)",
    title: "Family dentistry and cleanings (Demo)",
    description: "Demonstration listing for a family dental office offering cleanings, fillings, crowns and Invisalign consultations.",
    city: "Allen", languages: ["English", "Gujarati", "Hindi"], verification: "VERIFIED", credential: "MEDICAL_LICENSE",
  },
  // Food
  {
    category: "food", sub: "catering", businessName: "Sample Celebration Caterers (Demo)",
    title: "Indian catering for weddings and parties up to 500 guests (Demo)",
    description: "Demonstration listing for a full-service caterer: North and South Indian menus, live dosa and chaat stations, serving staff and setup for events of 50 to 500 guests.",
    city: "Irving", languages: ["English", "Hindi", "Telugu"], verification: "VERIFIED", credential: "BUSINESS_LICENSE",
    priceText: "From $18 per guest", tags: ["weddings", "200 guests", "live stations"],
  },
  {
    category: "food", sub: "tiffin", businessName: "Example Home Tiffin (Demo)",
    title: "Weekly vegetarian tiffin delivery (Demo)",
    description: "Demonstration listing: home-style vegetarian lunch and dinner tiffins delivered Monday to Friday across Frisco, Plano and Prosper.",
    city: "Frisco", languages: ["English", "Gujarati", "Hindi"], verification: "UNVERIFIED",
    priceText: "$12 per meal", tags: ["vegetarian", "weekly plan"],
  },
  {
    category: "food", sub: "restaurants", businessName: "Demo South Indian Kitchen (Demo)",
    title: "South Indian restaurant — dosa, idli and thali (Demo)",
    description: "Demonstration listing for a South Indian restaurant serving dosas, idli, Andhra meals and filter coffee. Takeout and party orders.",
    city: "Plano", languages: ["English", "Telugu", "Tamil"], verification: "VERIFIED", credential: "BUSINESS_LICENSE",
  },
  // Home services
  {
    category: "home-services", sub: "hvac", businessName: "Sample Cool Air HVAC (Demo)",
    title: "AC repair, furnace service and new installs (Demo)",
    description: "Demonstration listing for an HVAC contractor: same-day AC repair, seasonal tune-ups and new system installation across Collin and Denton counties.",
    city: "McKinney", languages: ["English", "Hindi"], verification: "VERIFIED", credential: "CONTRACTOR_LICENSE",
    priceText: "Diagnostic $89", tags: ["AC repair", "same day"],
  },
  {
    category: "home-services", sub: "plumbing", businessName: "Example Plumbing Pros (Demo)",
    title: "Plumbing repairs and water heaters (Demo)",
    description: "Demonstration listing: leak repair, drain cleaning and water heater replacement for homes and small businesses.",
    city: "Carrollton", languages: ["English", "Urdu"], verification: "VERIFIED", credential: "CONTRACTOR_LICENSE",
  },
  {
    category: "home-services", sub: "cleaning", businessName: "Demo Sparkle Cleaning (Demo)",
    title: "Home deep cleaning and move-out cleaning (Demo)",
    description: "Demonstration listing for residential cleaning: weekly cleaning, deep cleaning and move-in/move-out service.",
    city: "Prosper", languages: ["English", "Nepali"], verification: "UNVERIFIED",
  },
  // Finance & taxes
  {
    category: "finance-taxes", sub: "tax-preparation", businessName: "Sample Tax & Accounting (Demo)",
    title: "Individual and H-1B tax returns, FBAR filing (Demo)",
    description: "Demonstration listing for a CPA firm: individual returns, dual-status returns for new arrivals, FBAR/FATCA reporting and ITIN applications.",
    city: "Irving", languages: ["English", "Telugu", "Hindi"], verification: "VERIFIED", credential: "CPA_LICENSE",
    tags: ["FBAR", "ITIN", "dual status"],
  },
  {
    category: "finance-taxes", sub: "mortgage", businessName: "Example Home Loans (Demo)",
    title: "Mortgage pre-approval for first-time buyers (Demo)",
    description: "Demonstration listing for a mortgage broker helping first-time buyers, including visa holders, get pre-approved.",
    city: "Frisco", languages: ["English", "Hindi"], verification: "PENDING",
  },
  // Shopping
  {
    category: "shopping", sub: "grocery", businessName: "Sample Desi Grocers (Demo)",
    title: "Indian grocery — produce, spices and frozen foods (Demo)",
    description: "Demonstration listing for an Indian grocery store with fresh produce, spices, lentils, frozen foods and puja items.",
    city: "Frisco", languages: ["English", "Hindi", "Telugu", "Gujarati"], verification: "UNVERIFIED",
  },
  {
    category: "shopping", sub: "clothing", businessName: "Example Saree House (Demo)",
    title: "Sarees, lehengas and menswear (Demo)",
    description: "Demonstration listing for an ethnic clothing boutique: silk sarees, lehengas, kurtas and sherwanis, with alterations.",
    city: "Irving", languages: ["English", "Tamil", "Telugu"], verification: "UNVERIFIED",
  },
  // Travel
  {
    category: "travel", sub: "travel-agents", businessName: "Sample India Travels (Demo)",
    title: "Flights to India and holiday packages (Demo)",
    description: "Demonstration listing for a travel agency booking flights to India, multi-city itineraries and group tours.",
    city: "Irving", languages: ["English", "Hindi", "Malayalam"], verification: "UNVERIFIED",
  },
  {
    category: "travel", sub: "movers", businessName: "Example Movers DFW (Demo)",
    title: "Local and long-distance moving (Demo)",
    description: "Demonstration listing for a moving company: apartment and home moves within DFW and long-distance moves.",
    city: "Plano", languages: ["English", "Punjabi"], verification: "UNVERIFIED",
  },
  // Education
  {
    category: "education", sub: "tutoring", businessName: "Sample Learning Center (Demo)",
    title: "Math and science tutoring, grades 3–12 (Demo)",
    description: "Demonstration listing for a tutoring center: math, science, SAT prep and Kumon-style practice for grades 3 to 12.",
    city: "Frisco", languages: ["English", "Telugu"], verification: "UNVERIFIED",
  },
  {
    category: "education", sub: "music-dance", businessName: "Example Bharatanatyam School (Demo)",
    title: "Bharatanatyam and Carnatic music classes (Demo)",
    description: "Demonstration listing for a classical dance and music school offering Bharatanatyam, Kuchipudi and Carnatic vocal classes.",
    city: "Plano", languages: ["English", "Tamil", "Telugu"], verification: "UNVERIFIED",
  },
  {
    category: "education", sub: "it-training", businessName: "Demo Tech Academy (Demo)",
    title: "Selenium, Playwright and SDET training (Demo)",
    description: "Demonstration listing for IT training: test automation with Selenium and Playwright, Java for testers and interview preparation.",
    city: "Irving", languages: ["English", "Telugu", "Hindi"], verification: "UNVERIFIED", pending: true,
  },
  // Community
  {
    category: "community", sub: "organizations", businessName: "Sample Telugu Association (Demo)",
    title: "Telugu cultural association — membership and events (Demo)",
    description: "Demonstration listing for a community organization hosting Sankranti and Ugadi celebrations, youth programs and volunteering.",
    city: "Irving", languages: ["English", "Telugu"], verification: "UNVERIFIED",
  },
  {
    category: "community", sub: "volunteering", businessName: "Example Seva Network (Demo)",
    title: "Volunteer with food drives and senior support (Demo)",
    description: "Demonstration listing for a volunteer network organizing food drives, senior check-ins and new-arrival support.",
    city: "Dallas", languages: ["English", "Hindi", "Bengali"], verification: "UNVERIFIED",
  },
];

export interface DemoEvent {
  title: string;
  sub: string;
  description: string;
  city: string;
  venue: string;
  /** Days from the seed date. */
  inDays: number;
  hour: number;
  durationHours: number;
  isFree: boolean;
  priceText?: string;
  capacity?: number;
  languages: string[];
}

export const DEMO_EVENTS: DemoEvent[] = [
  {
    title: "Diwali Lights Community Festival (Demo)", sub: "festivals",
    description: "Demonstration event: an evening Diwali festival with diya lighting, rangoli, food stalls, cultural performances and fireworks viewing.",
    city: "Frisco", venue: "Demo Community Park Pavilion", inDays: 5, hour: 17, durationHours: 5, isFree: true, capacity: 1500,
    languages: ["English", "Hindi", "Telugu"],
  },
  {
    title: "Carnatic Music Evening (Demo)", sub: "concerts",
    description: "Demonstration event: a Carnatic vocal concert with violin and mridangam accompaniment.",
    city: "Plano", venue: "Demo Arts Center Auditorium", inDays: 2, hour: 18, durationHours: 3, isFree: false, priceText: "$25", capacity: 300,
    languages: ["English", "Tamil", "Telugu"],
  },
  {
    title: "Desi Tech Networking Night (Demo)", sub: "networking",
    description: "Demonstration event: networking for software engineers, QA and data professionals with lightning talks on test automation and AI.",
    city: "Irving", venue: "Demo Coworking Hub", inDays: 9, hour: 18, durationHours: 3, isFree: true, capacity: 120,
    languages: ["English"],
  },
  {
    title: "Kids Garba Workshop (Demo)", sub: "kids-family",
    description: "Demonstration event: a beginner garba and dandiya workshop for children aged 5–12, dandiya sticks provided.",
    city: "Allen", venue: "Demo Recreation Center", inDays: 3, hour: 10, durationHours: 2, isFree: false, priceText: "$10 per child", capacity: 60,
    languages: ["English", "Gujarati"],
  },
  {
    title: "Holi Color Run (Demo)", sub: "festivals",
    description: "Demonstration event: a 5K fun run with color stations, music and food trucks.",
    city: "Prosper", venue: "Demo Town Hall Grounds", inDays: 40, hour: 9, durationHours: 4, isFree: false, priceText: "$30", capacity: 800,
    languages: ["English", "Hindi"],
  },
  {
    title: "Navratri Celebration — New Jersey (Demo)", sub: "religious",
    description: "Demonstration event outside the pilot market, included to show nationwide discovery.",
    city: "Edison", venue: "Demo Expo Hall", inDays: 20, hour: 19, durationHours: 4, isFree: false, priceText: "$15", capacity: 2000,
    languages: ["English", "Gujarati", "Hindi"],
  },
];

export interface DemoJob {
  title: string;
  sub: string;
  company: string;
  description: string;
  city: string;
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "TEMPORARY";
  workArrangement: "ONSITE" | "HYBRID" | "REMOTE";
  salaryMin?: number;
  salaryMax?: number;
  salaryPeriod?: "HOUR" | "MONTH" | "YEAR";
  skills: string[];
}

export const DEMO_JOBS: DemoJob[] = [
  {
    title: "Java SDET — Playwright & REST Assured (Demo)", sub: "technology", company: "Example Logistics Tech (Demo)",
    description: "Demonstration job: build and maintain UI and API test automation using Java, Playwright and REST Assured; integrate suites into CI.",
    city: "Irving", employmentType: "FULL_TIME", workArrangement: "HYBRID", salaryMin: 115000, salaryMax: 140000, salaryPeriod: "YEAR",
    skills: ["Java", "Playwright", "REST Assured", "CI/CD"],
  },
  {
    title: "Senior Data Engineer (Demo)", sub: "technology", company: "Sample Retail Analytics (Demo)",
    description: "Demonstration job: design data pipelines on cloud warehouses and orchestrate batch and streaming jobs.",
    city: "Plano", employmentType: "FULL_TIME", workArrangement: "ONSITE", salaryMin: 135000, salaryMax: 165000, salaryPeriod: "YEAR",
    skills: ["Python", "SQL", "Spark", "Airflow"],
  },
  {
    title: "Registered Nurse — Hindi or Telugu speaking (Demo)", sub: "healthcare-jobs", company: "Demo Community Hospital (Demo)",
    description: "Demonstration job: RN position on a medical-surgical floor; bilingual Hindi or Telugu speakers preferred.",
    city: "Plano", employmentType: "FULL_TIME", workArrangement: "ONSITE", salaryMin: 38, salaryMax: 52, salaryPeriod: "HOUR",
    skills: ["RN license", "Patient care", "Hindi", "Telugu"],
  },
  {
    title: "Store Associate — Indian Grocery (Demo)", sub: "retail-hospitality", company: "Sample Desi Grocers (Demo)",
    description: "Demonstration job: part-time store associate for stocking, checkout and customer service; weekend availability required.",
    city: "Frisco", employmentType: "PART_TIME", workArrangement: "ONSITE", salaryMin: 14, salaryMax: 16, salaryPeriod: "HOUR",
    skills: ["Customer service", "Retail"],
  },
  {
    title: "Staff Accountant (Demo)", sub: "finance-jobs", company: "Sample Tax & Accounting (Demo)",
    description: "Demonstration job: bookkeeping, reconciliations and tax season support for individual and small-business clients.",
    city: "Irving", employmentType: "FULL_TIME", workArrangement: "HYBRID", salaryMin: 60000, salaryMax: 72000, salaryPeriod: "YEAR",
    skills: ["QuickBooks", "Excel", "Tax preparation"],
  },
  {
    title: "QA Automation Engineer — Remote (Demo)", sub: "technology", company: "Example Cloud Software (Demo)",
    description: "Demonstration remote job open to candidates anywhere in the USA: Selenium/Java framework maintenance and API testing.",
    city: "Seattle", employmentType: "CONTRACT", workArrangement: "REMOTE", salaryMin: 60, salaryMax: 75, salaryPeriod: "HOUR",
    skills: ["Java", "Selenium", "API testing", "SDET"],
  },
];

export interface DemoProperty {
  title: string;
  sub: string;
  description: string;
  city: string;
  transactionType: "RENT" | "SALE" | "ROOMMATE";
  propertyType: "APARTMENT" | "HOUSE" | "TOWNHOUSE" | "CONDO" | "ROOM";
  price: number;
  beds: number;
  baths: number;
  sqft?: number;
  availableInDays?: number;
}

export const DEMO_PROPERTIES: DemoProperty[] = [
  {
    title: "3-bed house for rent near Prosper ISD schools (Demo)", sub: "rentals",
    description: "Demonstration rental: single-family home with an open kitchen, two-car garage and fenced backyard, close to schools and parks.",
    city: "Prosper", transactionType: "RENT", propertyType: "HOUSE", price: 2350, beds: 3, baths: 2, sqft: 1850, availableInDays: 14,
  },
  {
    title: "4-bed home for rent in Frisco (Demo)", sub: "rentals",
    description: "Demonstration rental: two-story home with a study, game room and covered patio in a quiet neighborhood.",
    city: "Frisco", transactionType: "RENT", propertyType: "HOUSE", price: 2950, beds: 4, baths: 3, sqft: 2600, availableInDays: 30,
  },
  {
    title: "2-bed apartment in Irving Las Colinas (Demo)", sub: "rentals",
    description: "Demonstration rental: second-floor apartment with in-unit laundry, close to offices and the DART station.",
    city: "Irving", transactionType: "RENT", propertyType: "APARTMENT", price: 1650, beds: 2, baths: 2, sqft: 1100, availableInDays: 7,
  },
  {
    title: "Room for rent — vegetarian household, Plano (Demo)", sub: "roommates",
    description: "Demonstration roommate listing: furnished private room with shared kitchen in a vegetarian household; utilities included.",
    city: "Plano", transactionType: "ROOMMATE", propertyType: "ROOM", price: 750, beds: 1, baths: 1, availableInDays: 3,
  },
  {
    title: "4-bed home for sale in Plano (Demo)", sub: "for-sale",
    description: "Demonstration sale listing: updated home with new roof and HVAC, large backyard and a formal dining room.",
    city: "Plano", transactionType: "SALE", propertyType: "HOUSE", price: 485000, beds: 4, baths: 2.5, sqft: 2450,
  },
  {
    title: "Townhouse for sale in Allen (Demo)", sub: "for-sale",
    description: "Demonstration sale listing: low-maintenance townhouse with an attached garage near shopping and trails.",
    city: "Allen", transactionType: "SALE", propertyType: "TOWNHOUSE", price: 365000, beds: 3, baths: 2.5, sqft: 1780,
  },
];
