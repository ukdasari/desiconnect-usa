// Businesses shown in the partner panel beside the page content (strip at the bottom on smaller screens).
// To add a logo: put the file in src/assets/partners/, import it here and set `logo`. Without a logo the
// panel shows the business name. Leave `href` out until the website address is confirmed.
import agFintax from "@/assets/partners/agfintax.png";
import farm2cook from "@/assets/partners/farm2cook.png";
import baseraGrand from "@/assets/partners/basera-grand.png";
import insuguru from "@/assets/partners/insuguru.png";
import jatara from "@/assets/partners/jatara.png";
import ruchira from "@/assets/partners/ruchira.png";
import rotateSocial from "@/assets/partners/rotate-social.png";
import vinessaEvents from "@/assets/partners/vinessa-events.png";
import visitorsGuru from "@/assets/partners/visitors-guru.png";
import yoloEntertainments from "@/assets/partners/yolo-entertainments.png";

type ImageSource = string | { src: string };

export interface Partner {
  name: string;
  /** Short description shown under the name when there is no logo. */
  kind: string;
  href?: string;
  logo?: ImageSource;
  /** Logos drawn for dark backgrounds get a dark tile. */
  dark?: boolean;
  /** Tile colour behind the logo, to match a logo that has its own background (overrides `dark`). */
  tile?: string;
  /** Taller, less wide logos (about 2:1) get more height so they read at the same size as wide ones. */
  tall?: boolean;
}

export const PARTNERS_HEADING = "Proud community partners";

export const PARTNERS: Partner[] = [
  { name: "Vinessa Events", kind: "Weddings, events & catering, Plano", href: "https://vinessaevents.com/", logo: vinessaEvents, tall: true },
  { name: "Basera Grand Kitchen + Bar", kind: "Indian kitchen + bar", href: "https://baseragrand.com/", logo: baseraGrand, tile: "#0d0d0d", tall: true },
  { name: "Visitors Guru", kind: "Visitor insurance", logo: visitorsGuru, dark: true },
  { name: "Insuguru Insurance Services", kind: "Insurance", logo: insuguru },
  { name: "Rotate Social", kind: "Indian culinary lounge", href: "https://rotatesocial.com/", logo: rotateSocial, tile: "#4a1d0b", tall: true },
  { name: "AG FinTax", kind: "Financial & tax services", href: "https://www.agfintax.com/", logo: agFintax, tall: true },
  { name: "Jatara Indian Kitchen", kind: "Indian kitchen", href: "https://jataratx.com/", logo: jatara, tile: "#0a0a0a", tall: true },
  { name: "Farm2Cook", kind: "Fresh halal meat store, Frisco & Plano", logo: farm2cook, tall: true },
  { name: "Ruchira Indian Cuisine", kind: "Indian restaurant", logo: ruchira },
  { name: "Yolo Entertainments", kind: "Entertainment & events", logo: yoloEntertainments, tile: "#10236f", tall: true },
];

export const imageSrc = (img: ImageSource) => (typeof img === "string" ? img : img.src);
