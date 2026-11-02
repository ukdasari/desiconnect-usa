export const US_STATES = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"],
  ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"],
  ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"],
  ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"],
  ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
  ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"],
  ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
  ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"],
  ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"],
  ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"],
  ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
] as const;

export type StateCode = (typeof US_STATES)[number][0];
export const STATE_CODES = US_STATES.map(([code]) => code) as unknown as [StateCode, ...StateCode[]];

export function stateName(code: string): string {
  return US_STATES.find(([c]) => c === code)?.[1] ?? code;
}

/** Languages providers can list and users can filter by. */
export const LANGUAGES = [
  "English", "Hindi", "Telugu", "Tamil", "Kannada", "Malayalam", "Marathi", "Gujarati",
  "Punjabi", "Bengali", "Urdu", "Odia", "Nepali", "Sinhala",
] as const;
export type Language = (typeof LANGUAGES)[number];

/** Pilot market. The platform is nationwide; DFW is the default location until the user picks another. */
export const PILOT_MARKET = {
  name: "Dallas–Fort Worth",
  city: "Dallas",
  state: "TX" as StateCode,
  latitude: 32.7767,
  longitude: -96.797,
  cities: [
    "Dallas", "Fort Worth", "Plano", "Frisco", "Irving", "Arlington", "Allen", "McKinney",
    "Prosper", "Richardson", "Carrollton", "Coppell", "Lewisville", "Garland", "Denton", "Little Elm",
  ],
} as const;
