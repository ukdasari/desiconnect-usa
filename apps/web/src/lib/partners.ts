// Businesses shown in the partner panel beside the page content (strip at the bottom on smaller screens).
// To add a logo: put the file in src/assets/partners/, import it here and set `logo`. Without a logo the
// panel shows the business name. Leave `href` out until the website address is confirmed.
import insuguru from "@/assets/partners/insuguru.png";
import visitorsGuru from "@/assets/partners/visitors-guru.png";

type ImageSource = string | { src: string };

export interface Partner {
  name: string;
  /** Short description shown under the name when there is no logo. */
  kind: string;
  href?: string;
  logo?: ImageSource;
  /** Logos drawn for dark backgrounds get a dark tile. */
  dark?: boolean;
}

export const PARTNERS_HEADING = "Our partners";

export const PARTNERS: Partner[] = [
  { name: "Visitors Guru", kind: "Visitor insurance", logo: visitorsGuru, dark: true },
  { name: "Insuguru Insurance Services", kind: "Insurance", logo: insuguru },
  { name: "Rotate Bar & Kitchen", kind: "Restaurant & bar, Frisco", href: "https://www.rotatebarkitchen.com" },
  { name: "AG FinTax", kind: "Tax & CFO services", href: "https://agfintax.com" },
  { name: "Venesa Events", kind: "Events & decor" },
  { name: "Basera", kind: "Indian restaurant, Plano", href: "https://basera-plano.com" },
  { name: "Jatara Restaurant", kind: "Telangana cuisine" },
];

export const imageSrc = (img: ImageSource) => (typeof img === "string" ? img : img.src);
