// Indian and Pakistani restaurants in Dallas–Fort Worth, compiled on 2026-11-05 from public listings
// (Yelp, TripAdvisor and OpenTable search pages, Visit Plano, Zabihah, local press and guides).
//
// Rules for this file:
// - A street address or phone number is included only when a source stated it; otherwise the listing shows the city.
// - Places a source marked closed, or "coming soon" with no sign of opening, were left out.
// - Style tags (Halal, Vegetarian, South Indian…) are only added when a source said so.
// - None of these restaurants has claimed its listing. Owners can claim and correct it.
// Re-check periodically: restaurants open, move and close often.

export type Cuisine = "Indian" | "Pakistani" | "Indian & Pakistani";

export interface RestaurantSeed {
  name: string;
  cuisine: Cuisine;
  city: string;
  address?: string;
  phone?: string;
  styles?: string[];
  source: string;
}

const YELP_DALLAS = "https://www.yelp.com/search?find_desc=Indian+Restaurant&find_loc=Dallas%2C+TX";
const YELP_PAK = "https://www.yelp.com/search?cflt=pakistani&find_loc=Dallas%2C+TX";
const YELP_PAK_FW = "https://www.yelp.com/search?cflt=pakistani&find_loc=Fort+Worth%2C+TX";
const YELP_75240 = "https://www.yelp.com/search?cflt=indpak&find_loc=Dallas%2C+TX+75240";
const YELP_DOWNTOWN = "https://www.yelp.com/search?cflt=indpak&find_loc=Downtown%2C+Dallas%2C+TX";
const YELP_NEW = "https://www.yelp.com/search?find_desc=New+Indian+Restaurant&find_loc=Dallas%2C+TX";
const YELP_DHABA = "https://www.yelp.com/search?find_desc=Indian+Dhaba&find_loc=Dallas%2C+TX";
const TRIPADVISOR = "https://www.tripadvisor.com/Restaurants-g55711-c24-Dallas_Texas.html";
const TRIPADVISOR_PAK = "https://www.tripadvisor.in/Restaurants-g55711-c10748-Dallas_Texas.html";
const TABLEAGENT = "https://tableagent.com/dallas/indian-cuisine/";
const SECRET_DALLAS = "https://secretdallas.com/indian-restaurants-dallas/";
const OT_IRVING = "https://www.opentable.co.uk/cuisine/best-indian-restaurants-irving-tx";
const OT_PLANO = "https://www.opentable.ca/cuisine/best-indian-restaurants-plano-tx?lang=fr-ca";
const OT_COLONY = "https://www.opentable.com.au/cuisine/best-indian-restaurants-the-colony-tx";
const OT_ALLEN = "https://opentable.com/cuisine/best-indian-restaurants-allen-tx";
const LOCALPROFILE = "https://localprofile.com/2022/03/29/best-indian-restaurants-in-plano/";
const PLANOMOMS = "https://planomoms.com/guide/categories/restaurants-all-things-food/indian-cuisine/";
const VISITPLANO = "https://www.visitplano.com/dining_type/indian-middle-eastern/page/3/";
const ATLY_PLANO_SOUTH = "https://www.atly.com/united-states/texas/plano/best-dinner-spots-south-indian";
const UBER_CARROLLTON = "https://www.ubereats.com/dish/carrollton-tx/vegetable-biryani";
const UBER_PROSPER = "https://www.ubereats.com/plukup/dish/prosper-tx/mongolian-beef";
const SIRVED_PROSPER = "https://www.sirved.com/city/prosper-texas-usa/all/indian";
const SIRVED_GRAPEVINE = "https://www.sirved.com/city/grapevine-texas-usa/all/indian/2";
const TRIP101_MCKINNEY = "https://trip101.com/article/indian-restaurants-in-mckinney";
const MONEYINC_FW = "https://moneyinc.com/best-indian-restaurants-forth-worth-texas/";
const FORTWORTH_COM = "https://www.fortworth.com/blog/stories/post/indian-cuisine-in-fort-worth/";
const SUPERPAGES_ARLINGTON = "https://cars.superpages.com/arlington-tx/indian-restaurants";
const FOODLE = "https://foodle.pro/mobsfoodcritic/toplists";

export const RESTAURANTS: RestaurantSeed[] = [
  // ---------------------------------------------------------------- Dallas
  { name: "Kalachandji's", cuisine: "Indian", city: "Dallas", address: "5430 Gurley Ave", styles: ["Vegetarian"], source: TABLEAGENT },
  { name: "Namak Indian Cuisine", cuisine: "Indian", city: "Dallas", address: "1700 Pacific Ave, Suite C101", source: TRIPADVISOR },
  { name: "Indian Masala Tadka", cuisine: "Indian", city: "Dallas", address: "1001 Ross Ave", source: TRIPADVISOR },
  { name: "Elephant Indian Bar & Grill", cuisine: "Indian", city: "Dallas", source: YELP_DALLAS },
  { name: "Shivas Bar & Grill", cuisine: "Indian", city: "Dallas", source: YELP_DOWNTOWN },
  { name: "Gyanna Indian Restaurant & Bar", cuisine: "Indian", city: "Dallas", source: YELP_DOWNTOWN },
  { name: "8 Cloves Spices of India", cuisine: "Indian", city: "Dallas", address: "920 S Harwood St, Suite 180 (Dallas Farmers Market)", source: TRIPADVISOR_PAK },
  { name: "Roti Grill", cuisine: "Indian", city: "Dallas", address: "4438 McKinney Ave", source: SECRET_DALLAS },
  { name: "Mughlai Fine Indian Cuisine", cuisine: "Indian", city: "Dallas", address: "5301 Alpha Rd", source: TABLEAGENT },
  { name: "India Palace", cuisine: "Indian", city: "Dallas", source: YELP_75240 },
  { name: "India Chaat Cafe", cuisine: "Indian", city: "Dallas", styles: ["Street food"], source: YELP_75240 },
  { name: "Hyderabadi Biryani & BBQ", cuisine: "Indian", city: "Dallas", address: "11276 Harry Hines Blvd, #103", styles: ["Hyderabadi", "Biryani"], source: SECRET_DALLAS },
  { name: "Mumbai Grill", cuisine: "Indian", city: "Dallas", address: "17370 Preston Rd, #490", source: SECRET_DALLAS },
  { name: "KashKan", cuisine: "Indian", city: "Dallas", source: "https://www.yelp.com/search?find_desc=Indian+Food&find_loc=Dallas%2C+TX" },
  { name: "GoldenLeaf Bar & Grill", cuisine: "Indian", city: "Dallas", source: YELP_75240 },
  { name: "Curry Bliss", cuisine: "Indian", city: "Dallas", source: YELP_75240 },
  { name: "Spice of Richardson", cuisine: "Indian", city: "Dallas", source: YELP_75240 },
  { name: "Lyari Cafe", cuisine: "Pakistani", city: "Dallas", address: "11641 Harry Hines Blvd, #201", styles: ["Halal"], source: SECRET_DALLAS },
  { name: "Tikka N Kabab", cuisine: "Pakistani", city: "Dallas", source: YELP_PAK },
  { name: "Al Kabob Grill & Cafe", cuisine: "Pakistani", city: "Dallas", source: YELP_PAK },
  { name: "Mayfair Garden Express", cuisine: "Pakistani", city: "Dallas", styles: ["Fusion"], source: "https://www.yelp.com/search?cflt=pakistani&find_loc=Dallas%2C+TX+75212" },
  { name: "Halal Mother Truckers", cuisine: "Pakistani", city: "Dallas", styles: ["Food truck", "Halal"], source: "https://www.yelp.com/search?cflt=pakistani&find_loc=Dallas%2C+TX+75212" },

  // ---------------------------------------------------------------- Addison
  { name: "Sigree Indian Restaurant & Banquet", cuisine: "Indian", city: "Addison", source: YELP_DHABA },

  // ---------------------------------------------------------------- Richardson
  { name: "Fusion Republic Indian Kitchen & Bar", cuisine: "Indian", city: "Richardson", source: YELP_NEW },
  { name: "Usmania Fine Dining", cuisine: "Pakistani", city: "Richardson", address: "400 N Coit Rd", source: TRIPADVISOR_PAK },
  { name: "Bawarchi Indian Cuisine (Richardson)", cuisine: "Indian", city: "Richardson", source: OT_ALLEN },
  { name: "Mumtaz Indian Restaurant (Richardson)", cuisine: "Indian", city: "Richardson", source: "https://www.ubereats.com/plukup/dish/coppell-tx/meat-samosa" },
  { name: "Masala Wok Indian + Asian Fare", cuisine: "Indian", city: "Richardson", styles: ["Indo-Chinese"], source: "https://www.ubereats.com/plukup/dish/carrollton-tx/chapati" },
  { name: "Saravanaa Bhavan (Richardson)", cuisine: "Indian", city: "Richardson", styles: ["South Indian", "Vegetarian"], source: "https://www.axios.com/local/dallas/2025/09/30/tasty-tuesday-saravanaa-bhavan" },
  { name: "Imperial Biryani & Cafe", cuisine: "Indian", city: "Richardson", address: "400 N Greenville Ave, #23", styles: ["Biryani"], source: FOODLE },
  { name: "Cloud Naan", cuisine: "Pakistani", city: "Richardson", styles: ["Halal", "Fusion"], source: "https://www.doordash.com/food-delivery/richardson-tx-restaurants/pakistani/" },
  { name: "Mughlai Express", cuisine: "Indian", city: "Richardson", address: "201 S Greenville Ave", source: UBER_CARROLLTON },
  { name: "Zyka Indian Kitchen", cuisine: "Indian", city: "Richardson", styles: ["Halal"], source: "https://halalspy.com/halal-food-guide/usa/dallas/" },

  // ---------------------------------------------------------------- Irving / Las Colinas
  { name: "Sanjh", cuisine: "Indian", city: "Irving", address: "5250 N O'Connor Blvd, Suite 146", styles: ["Fine dining"], source: "https://www.papercitymag.com/city-guide/sanjh/" },
  { name: "Desi District (Las Colinas)", cuisine: "Indian", city: "Irving", address: "220 Las Colinas Blvd E, Suite 264", styles: ["Street food"], source: "https://www.dallasobserver.com/location/desi-district-12456210" },
  { name: "Saravanaa Bhavan (Irving)", cuisine: "Indian", city: "Irving", address: "8604 N MacArthur Blvd", phone: "(972) 506-7755", styles: ["South Indian", "Vegetarian"], source: "https://www.allmenus.com/tx/irving/508818-saravanaa-bhavan/menu/" },
  { name: "The Delhi Lounge", cuisine: "Indian", city: "Irving", source: OT_IRVING },
  { name: "Madira N Masala", cuisine: "Indian", city: "Irving", source: "https://www.opentable.co.uk/cuisine/best-indian-restaurants-bishop-arts-tx" },
  { name: "Nirvana Lounge and Bar", cuisine: "Indian", city: "Irving", source: OT_COLONY },
  { name: "Spices of India Kitchen", cuisine: "Indian", city: "Irving", source: YELP_NEW },
  { name: "Bawarchi Indian Cuisine (Irving)", cuisine: "Indian", city: "Irving", source: YELP_DHABA },
  { name: "Namaste Grill & Bar (Irving)", cuisine: "Indian", city: "Irving", address: "2234 W Walnut Hill Ln", source: TABLEAGENT },
  { name: "O'Desi Aroma (Irving)", cuisine: "Indian", city: "Irving", address: "6450 N MacArthur Blvd, Suite 110", source: LOCALPROFILE },
  { name: "Nizam's Kitchen", cuisine: "Indian", city: "Irving", source: "https://www.atly.com/united-states/texas/irving/las-colinas/best-indian-food" },
  { name: "Eggholic Indian Street Food", cuisine: "Indian", city: "Irving", styles: ["Street food"], source: UBER_CARROLLTON },
  { name: "Dera Grill", cuisine: "Pakistani", city: "Irving", source: "https://www.yelp.com/search?cflt=pakistani&find_loc=Dallas%2C+TX+75212" },
  { name: "Nihari Haven", cuisine: "Pakistani", city: "Irving", address: "4440 W Airport Fwy", styles: ["Halal"], source: "https://www.zabihah.com/restaurants/08dd37e5-4c3f-4434-89a8-cf685662f42d/nihari-haven-irving-tx" },
  { name: "Texas King Restaurant (Irving)", cuisine: "Pakistani", city: "Irving", address: "3455 N Belt Line Rd, #103", styles: ["Halal"], source: FOODLE },
  { name: "Deccan Grill (Irving)", cuisine: "Indian & Pakistani", city: "Irving", address: "535 W Airport Fwy", source: "https://www.seasoned.co/job/server-deccan-grill-irving-irving-tx_90e49e56-6942-4dbd-8a08-8e484c6dba78" },

  // ---------------------------------------------------------------- Coppell
  { name: "Roti Grill (Coppell)", cuisine: "Indian", city: "Coppell", address: "761 S MacArthur Blvd, #101", source: "https://foursquare.com/top-places/dallas/best-places-nan" },
  { name: "Parotta Express", cuisine: "Indian", city: "Coppell", styles: ["South Indian"], source: SIRVED_GRAPEVINE },

  // ---------------------------------------------------------------- Carrollton
  { name: "Al Markaz", cuisine: "Indian & Pakistani", city: "Carrollton", address: "1205 W Trinity Mills Rd", styles: ["Halal"], source: "https://www.zabihah.com/restaurants/c9ef73c2-7767-11ef-95ae-6045bdeb9f57/al-markaz-carrollton-tx" },
  { name: "Beba BBQ", cuisine: "Pakistani", city: "Carrollton", styles: ["Halal", "BBQ"], source: YELP_PAK_FW },
  { name: "Mai Colachi (Carrollton)", cuisine: "Pakistani", city: "Carrollton", source: "https://www.dallasobserver.com/?p=40586960" },
  { name: "Kerala Kitchen", cuisine: "Indian", city: "Carrollton", styles: ["South Indian"], source: "https://www.olympusproperty.com/apartments/tx/carrollton/lux-on-main/blog/4-best-places-for-indian-food-in-carrollton" },
  { name: "Rakhi's Kitchen", cuisine: "Indian", city: "Carrollton", source: "https://www.olympusproperty.com/apartments/tx/carrollton/lux-on-main/blog/4-best-places-for-indian-food-in-carrollton" },
  { name: "Spicy Village Indian Cuisine & Cafe", cuisine: "Indian", city: "Carrollton", address: "1404 W Hebron Pkwy, Suite 116", source: SIRVED_PROSPER },

  // ---------------------------------------------------------------- Plano
  { name: "Chaat N Dosa", cuisine: "Indian", city: "Plano", address: "9720 Coit Rd, Suite 110", styles: ["Street food", "South Indian"], source: LOCALPROFILE },
  { name: "O'Desi Aroma (Plano)", cuisine: "Indian", city: "Plano", address: "8448 Parkwood Blvd, Suite 500", phone: "(972) 924-0644", source: "https://www.visitplano.com/dining/odesi-aroma/" },
  { name: "Kumar's", cuisine: "Indian", city: "Plano", address: "1301 Custer Rd, #510", source: "https://www.visitplano.com/dining/kumars" },
  { name: "Maharaja Indian Restaurant (Plano)", cuisine: "Indian", city: "Plano", address: "4152 W Spring Creek Pkwy, Suite 132", source: PLANOMOMS },
  { name: "Malgudi Garden", cuisine: "Indian", city: "Plano", address: "5024 Tennyson Pkwy", styles: ["Vegetarian"], source: PLANOMOMS },
  { name: "Mumtaz Indian Restaurant (Plano)", cuisine: "Indian", city: "Plano", address: "301 W Parker Rd, Suite 115", phone: "(972) 398-7934", source: "https://www.visitplano.com/dining/mumtaz-indian-restaurant/" },
  { name: "Rice N Roti", cuisine: "Indian", city: "Plano", address: "2411 Coit Rd, Suite 160", source: PLANOMOMS },
  { name: "Sankalp, The Taste of India", cuisine: "Indian", city: "Plano", address: "3680 TX-121", source: TABLEAGENT },
  { name: "The Yellow Chilli", cuisine: "Indian", city: "Plano", styles: ["Fine dining"], source: OT_PLANO },
  { name: "Kesari Indian Cuisine", cuisine: "Indian", city: "Plano", address: "3100 Independence Pkwy, #319", source: SECRET_DALLAS },
  { name: "Anjappar Chettinad", cuisine: "Indian", city: "Plano", address: "4940 McDermott Rd, #200", phone: "(214) 705-1800", styles: ["South Indian"], source: "https://visitplano.com/dining/anjappar-chettinad-indian-restaurant" },
  { name: "Kuppanna", cuisine: "Indian", city: "Plano", styles: ["South Indian"], source: ATLY_PLANO_SOUTH },
  { name: "Salem RR Biriyani (Plano)", cuisine: "Indian", city: "Plano", styles: ["South Indian", "Biryani"], source: ATLY_PLANO_SOUTH },
  { name: "Desi Village", cuisine: "Indian", city: "Plano", styles: ["South Indian"], source: ATLY_PLANO_SOUTH },
  { name: "Mynaa Kitchen", cuisine: "Indian", city: "Plano", styles: ["South Indian", "Takeout only"], source: "https://www.atly.com/united-states/texas/plano/best-south-indian" },
  { name: "Saravanaa Bhavan (Plano)", cuisine: "Indian", city: "Plano", styles: ["South Indian", "Vegetarian"], source: "https://planomagazine.com/?p=21874" },
  { name: "Dil Se Desi", cuisine: "Indian", city: "Plano", address: "6205 Coit Rd, Suite 166", phone: "(469) 969-0330", source: "https://www.visitplano.com/dining/dil-se-desi/" },
  { name: "Bawarchi Biryanis (Plano)", cuisine: "Indian", city: "Plano", phone: "(972) 234-9009", styles: ["Biryani"], source: "https://www.visitplano.com/dining/bawarchi-biryani" },
  { name: "Eat Street Indian Kitchen", cuisine: "Indian", city: "Plano", styles: ["Street food"], source: "https://www.visitplano.com/dining/eat-street-indian-kitchen/" },
  { name: "Jabbar Bhai Biriyani", cuisine: "Indian", city: "Plano", styles: ["Biryani"], source: "https://www.visitplano.com/dining/jabbar-bhai-biriyani-restaurant/" },
  { name: "Flavors Indian Kitchen", cuisine: "Indian", city: "Plano", address: "4020 Hedgcoxe Rd, #200", phone: "(945) 888-0606", source: "https://www.visitplano.com/dining/flavors-indian-kitchen/" },
  { name: "Grand Dhaba", cuisine: "Indian", city: "Plano", address: "300 Chisholm Pl", styles: ["Punjabi"], source: "https://www.visitplano.com/dining/grand-dhaba/" },
  { name: "Sizzling Spices", cuisine: "Indian", city: "Plano", address: "1017 N Central Expy, Suite 250", phone: "(214) 501-3233", source: "https://www.visitplano.com/dining/sizzling-spices/" },
  { name: "Blist'r Indian Kitchen", cuisine: "Indian", city: "Plano", address: "Legacy Hall", styles: ["Street food"], source: "https://visitplano.com/dining_type/indian-middle-eastern/page/2" },
  { name: "Basera Indian Cuisine", cuisine: "Indian", city: "Plano", source: VISITPLANO },
  { name: "Everest Indian & Himalayan Restaurant & Bar", cuisine: "Indian", city: "Plano", styles: ["Nepali"], source: "https://www.visitplano.com/dining/everest-indian-himalayan-restaurant-grill/" },
  { name: "Shaahi Biryani", cuisine: "Indian", city: "Plano", address: "3421 E Renner Rd, Suite 110", styles: ["Biryani"], source: FOODLE },
  { name: "Biryaniify", cuisine: "Indian", city: "Plano", address: "4006 W Plano Pkwy, Suite 160", styles: ["Biryani"], source: SIRVED_PROSPER },
  { name: "Karahi Point", cuisine: "Pakistani", city: "Plano", address: "2432 Preston Rd, Suite 340A", phone: "(214) 440-2140", styles: ["Halal"], source: "https://www.visitplano.com/dining/karahi-point/" },
  { name: "Khan Grill", cuisine: "Indian & Pakistani", city: "Plano", styles: ["Halal"], source: "https://www.visitplano.com/dining/khan-grill/" },
  { name: "Lahori Kabab Halal", cuisine: "Pakistani", city: "Plano", address: "6832 Coit Rd", styles: ["Halal"], source: "https://namaste-locator.vercel.app/texas/plano/restaurant/6930" },
  { name: "The Real BBQ", cuisine: "Pakistani", city: "Plano", styles: ["BBQ"], source: YELP_PAK },
  { name: "Kababistan", cuisine: "Pakistani", city: "Plano", styles: ["Afghan"], source: YELP_PAK },
  { name: "Mai Colachi (Plano)", cuisine: "Pakistani", city: "Plano", source: "https://www.dallasobserver.com/?p=40586960" },
  { name: "Plano Village Restaurant (Texas King)", cuisine: "Pakistani", city: "Plano", address: "3825 W Spring Creek Pkwy", styles: ["Halal"], source: "https://www.zabihah.com/biz/Plano/Texas-King/9q7olDgrGy" },
  { name: "Deccan Grill (Plano)", cuisine: "Indian & Pakistani", city: "Plano", address: "909 W Spring Creek Pkwy, Suite 230", source: "https://www.zabihah.com/biz/Plano/Deccan-Grill/zbaLMaMPrO" },

  // ---------------------------------------------------------------- Frisco
  { name: "The Mango Yard", cuisine: "Indian", city: "Frisco", address: "12275 University Dr, #100", styles: ["Fine dining", "Hyderabadi"], source: "https://dallas.culturemap.com/news/restaurants-bars/mango-yard-indian-frisco/" },
  { name: "Rotate Social", cuisine: "Indian", city: "Frisco", address: "5454 Main St, #123", source: PLANOMOMS },
  { name: "Marina Indian Restaurant", cuisine: "Indian", city: "Frisco", address: "4617 Coit Rd, #130", source: "https://www.opentable.de/r/marina-indian-restaurant-frisco" },
  { name: "Spicerack Frisco", cuisine: "Indian", city: "Frisco", source: "https://www.opentable.com.au/cuisine/best-indian-restaurants-sherman" },
  { name: "Karahi Boys", cuisine: "Pakistani", city: "Frisco", address: "3401 Preston Rd, Suite 1", styles: ["Halal"], source: "https://www.atly.com/location/KarahiBoys" },
  { name: "Roti Grill (Frisco)", cuisine: "Indian", city: "Frisco", address: "3675 Gaylord Pkwy", source: PLANOMOMS },
  { name: "Sitara Grand", cuisine: "Indian", city: "Frisco", source: "https://www.ubereats.com/plukup/dish/carrollton-tx/chapati" },
  { name: "Swadeshi", cuisine: "Indian", city: "Frisco", source: "https://www.ubereats.com/dish/allen-tx/cheese-naan" },
  { name: "Bawarchi West Frisco", cuisine: "Indian", city: "Frisco", source: "https://www.ubereats.com/p8ckup/dish/prosper-tx/lamb-chops" },

  // ---------------------------------------------------------------- The Colony
  { name: "Windmills", cuisine: "Indian", city: "The Colony", styles: ["Fine dining"], source: "https://opentable.com.au/phrase/102367" },
  { name: "India 101 Xpress", cuisine: "Indian", city: "The Colony", source: SIRVED_GRAPEVINE },

  // ---------------------------------------------------------------- Allen
  { name: "Silver Spoon Restaurant", cuisine: "Pakistani", city: "Allen", source: YELP_PAK_FW },
  { name: "Spice Creations", cuisine: "Indian", city: "Allen", address: "1328 W McDermott Dr, #200", source: TRIP101_MCKINNEY },
  { name: "Curries N Cravings", cuisine: "Indian", city: "Allen", address: "2023 W McDermott Dr, Suite 180", source: TRIP101_MCKINNEY },
  { name: "Burgers & Curries", cuisine: "Indian", city: "Allen", styles: ["Fusion"], source: "https://www.atly.com/united-states/texas/allen/best-indian-food" },

  // ---------------------------------------------------------------- McKinney
  { name: "Tantra Modern Indian Bistro", cuisine: "Indian", city: "McKinney", styles: ["Fine dining"], source: OT_ALLEN },
  { name: "Honest", cuisine: "Indian", city: "McKinney", address: "8910 TX-121, Suite 220", styles: ["Street food"], source: TRIP101_MCKINNEY },
  { name: "Indian Kitchen (McKinney)", cuisine: "Indian", city: "McKinney", address: "3905 W University Dr, Suite 400", source: SIRVED_PROSPER },
  { name: "51 Rainbow Indian Grill & Momo House", cuisine: "Indian", city: "McKinney", address: "5151 McKinney Ranch Pkwy, Suite 110", styles: ["Nepali"], source: SIRVED_PROSPER },
  { name: "Salem RR Biryani (McKinney)", cuisine: "Indian", city: "McKinney", styles: ["South Indian", "Biryani"], source: "https://www.atly.com/united-states/texas/mckinney/best-indian-food" },
  { name: "Kashkan Dhaba Express", cuisine: "Indian", city: "McKinney", styles: ["Punjabi"], source: UBER_PROSPER },

  // ---------------------------------------------------------------- Prosper
  { name: "Desi District (Prosper)", cuisine: "Indian", city: "Prosper", styles: ["Street food"], source: UBER_PROSPER },
  { name: "Raasa Restaurant & Bar", cuisine: "Indian", city: "Prosper", source: UBER_PROSPER },

  // ---------------------------------------------------------------- Lewisville, Highland Village, Flower Mound, Grapevine
  { name: "Shinwari Kitchen", cuisine: "Pakistani", city: "Lewisville", source: YELP_PAK },
  { name: "Delhi6 Indian Kitchen & Bar", cuisine: "Indian", city: "Highland Village", source: YELP_PAK },
  { name: "Curry Up Now (Flower Mound)", cuisine: "Indian", city: "Flower Mound", address: "2717 Cross Timbers Rd, Suite 400", phone: "(214) 222-5596", styles: ["Halal", "Fusion"], source: "https://curryupnow.com/blog/indian-food-coppell" },
  { name: "Curry's Indian Cafe", cuisine: "Indian", city: "Flower Mound", source: SIRVED_GRAPEVINE },
  { name: "Karmma & Kocktails by Teatro", cuisine: "Indian", city: "Grapevine", source: OT_COLONY },

  // ---------------------------------------------------------------- Garland, Rockwall, Denton, Euless
  { name: "BBQ King", cuisine: "Pakistani", city: "Garland", styles: ["BBQ"], source: YELP_PAK },
  { name: "Curry Express Indian Bistro", cuisine: "Indian", city: "Rockwall", address: "2014 S Goliad St, #140", source: SECRET_DALLAS },
  { name: "Sangam Indian Restaurant", cuisine: "Indian", city: "Denton", source: SIRVED_GRAPEVINE },
  { name: "Nanglo Indian and Nepalese Restaurant", cuisine: "Indian", city: "Euless", styles: ["Nepali"], source: "https://www.ubereats.com/plukup/category/euless-tx/indian" },
  { name: "Thamel Beer Garden Indian and Nepalese Restaurant", cuisine: "Indian", city: "Euless", styles: ["Nepali"], source: SIRVED_GRAPEVINE },

  // ---------------------------------------------------------------- Arlington
  { name: "Saffron Kitchen and Bar", cuisine: "Indian", city: "Arlington", address: "5005 S Cooper St", source: TABLEAGENT },
  { name: "Indian Bistro 14", cuisine: "Indian", city: "Arlington", address: "4519 Matlock Rd, #135", source: "https://directory.yext.com/en/indianbistro14-4100774629" },
  { name: "India Grill", cuisine: "Indian", city: "Arlington", address: "4000 Five Points Dr, Suite 109", source: SUPERPAGES_ARLINGTON },
  { name: "Tandoor Indian Restaurant", cuisine: "Indian", city: "Arlington", address: "532 Fielder North Plaza", source: SUPERPAGES_ARLINGTON },
  { name: "India Star", cuisine: "Indian", city: "Arlington", address: "703 W Park Row Dr", source: SUPERPAGES_ARLINGTON },
  { name: "Spicy Bites", cuisine: "Indian", city: "Arlington", address: "1220 S Cooper St", source: SUPERPAGES_ARLINGTON },
  { name: "Desi Kitchen", cuisine: "Indian", city: "Arlington", address: "1515 S Cooper St, Suite D", source: SUPERPAGES_ARLINGTON },
  { name: "Desi Cravings", cuisine: "Indian", city: "Arlington", source: "https://www.trycaviar.com/food-delivery/arlington-tx-restaurants/indian/" },

  // ---------------------------------------------------------------- Fort Worth
  { name: "Swad Indian & Nepali Cuisine", cuisine: "Indian", city: "Fort Worth", address: "8333 Sohi Dr, Suite 100", styles: ["Nepali"], source: MONEYINC_FW },
  { name: "Spice 8", cuisine: "Indian", city: "Fort Worth", address: "5633 N Tarrant Pkwy", source: "https://blog.giftya.com/article/top-5-best-indian-restaurants-in-fort-worth" },
  { name: "Bombay Grill", cuisine: "Indian", city: "Fort Worth", address: "4625 Donnelly Ave", source: MONEYINC_FW },
  { name: "King's Kitchen", cuisine: "Indian", city: "Fort Worth", address: "5054 Trail Lake Dr, Suite 109", source: MONEYINC_FW },
  { name: "Maharaja (Fort Worth)", cuisine: "Indian", city: "Fort Worth", address: "6308 Hulen Bend Blvd", source: FORTWORTH_COM },
  { name: "Namaste Grill & Bar (Fort Worth)", cuisine: "Indian", city: "Fort Worth", source: "https://www.atly.com/united-states/texas/fort-worth/best-indian-food" },
  { name: "Hyderabad House (Fort Worth)", cuisine: "Indian", city: "Fort Worth", styles: ["Hyderabadi", "Biryani"], source: "https://www.opentable.com.mx/cuisine/best-indian-restaurants-downtown-fort-worth-tx" },
  { name: "Amma's Indian Cuisine", cuisine: "Indian", city: "Fort Worth", source: FORTWORTH_COM },
  { name: "Taj Chaat House", cuisine: "Indian", city: "Fort Worth", address: "6248 Rufe Snow Dr", styles: ["Street food"], source: SUPERPAGES_ARLINGTON },
  { name: "Nepali Chulo and Indian Cuisine", cuisine: "Indian", city: "Fort Worth", address: "5601 Basswood Blvd, Suite 197", styles: ["Nepali"], source: SUPERPAGES_ARLINGTON },
  { name: "Curry Cowboys", cuisine: "Indian", city: "Fort Worth", source: "https://www.atly.com/united-states/texas/fort-worth/best-dinner-spots-indian-food" },
];
