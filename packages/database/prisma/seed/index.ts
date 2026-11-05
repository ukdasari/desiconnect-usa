/* Seed script: categories, gazetteer, markets and (outside production) clearly-labeled demo data.
 *
 *   pnpm db:seed                 # categories + geo + markets + demo data
 *   SEED_DEMO=false pnpm db:seed # reference data only
 *
 * Demo data is refused when NODE_ENV=production unless SEED_DEMO=true is set explicitly.
 */
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient, type Prisma } from "@prisma/client";
import { CATEGORIES } from "@desiconnect/contracts";
import { DFW_CITIES, DFW_ZIPS, MARKETS, US_METROS, type GeoSeed } from "./geo";
import { DEMO_EVENTS, DEMO_JOBS, DEMO_PROPERTIES, DEMO_SERVICES } from "./demo";
import { RESTAURANTS, type RestaurantSeed } from "./restaurants";

const prisma = new PrismaClient();

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "DemoPass123!";
const DEMO_ACCOUNTS = {
  admin: { email: "admin@desiconnect.example", name: "Demo Admin" },
  provider: { email: "provider@desiconnect.example", name: "Demo Provider" },
  user: { email: "user@desiconnect.example", name: "Demo User" },
} as const;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/\(demo\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function listingSlug(title: string, id: string): string {
  return `${slugify(title)}-${id.slice(0, 6)}`;
}

/** Deterministic small offset so demo pins in the same city don't overlap exactly. */
function jitter(seed: string, scale = 0.03): number {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return ((Math.abs(h) % 1000) / 1000 - 0.5) * scale;
}

const allPlaces: GeoSeed[] = [...DFW_CITIES, ...US_METROS];
function cityCoords(city: string): { state: string; lat: number; lng: number } {
  const place = allPlaces.find(([c]) => c === city);
  if (!place) throw new Error(`Seed city missing from gazetteer: ${city}`);
  return { state: place[1], lat: place[2], lng: place[3] };
}

async function seedCategories() {
  let order = 0;
  for (const def of CATEGORIES) {
    const parent = await prisma.category.upsert({
      where: { slug: def.slug },
      update: { name: def.name, tagline: def.tagline, icon: def.icon, kind: def.kind, regulated: def.regulated, sortOrder: order, parentId: null },
      create: { slug: def.slug, name: def.name, tagline: def.tagline, icon: def.icon, kind: def.kind, regulated: def.regulated, sortOrder: order },
    });
    order += 1;
    let subOrder = 0;
    for (const sub of def.subcategories) {
      await prisma.category.upsert({
        where: { slug: sub.slug },
        update: { name: sub.name, icon: def.icon, kind: def.kind, regulated: def.regulated, parentId: parent.id, sortOrder: subOrder },
        create: { slug: sub.slug, name: sub.name, icon: def.icon, kind: def.kind, regulated: def.regulated, parentId: parent.id, sortOrder: subOrder },
      });
      subOrder += 1;
    }
  }
  console.log(`✓ ${CATEGORIES.length} primary categories and their subcategories`);
}

async function seedGeo() {
  await prisma.geoPlace.deleteMany();
  const rows = [...DFW_CITIES, ...DFW_ZIPS, ...US_METROS].map(([city, state, latitude, longitude, zipCode]) => ({
    city, state, latitude, longitude, zipCode: zipCode ?? null,
  }));
  await prisma.geoPlace.createMany({ data: rows });
  for (const m of MARKETS) {
    await prisma.market.upsert({
      where: { slug: m.slug },
      update: { name: m.name, state: m.state, latitude: m.latitude, longitude: m.longitude, radiusMiles: m.radiusMiles },
      create: { ...m, launchedAt: m.isActive ? new Date() : null },
    });
  }
  console.log(`✓ ${rows.length} gazetteer places, ${MARKETS.length} markets (DFW active)`);
}

async function clearDemoData() {
  // Includes listings the demo accounts created while someone tried the app (they aren't flagged isDemo).
  const demoListings = await prisma.listing.findMany({ where: { OR: [{ isDemo: true }, { owner: { isDemo: true } }] }, select: { id: true } });
  const ids = demoListings.map((l) => l.id);
  await prisma.$transaction([
    prisma.inquiry.deleteMany({ where: { listingId: { in: ids } } }),
    prisma.appointment.deleteMany({ where: { listingId: { in: ids } } }),
    prisma.report.deleteMany({ where: { targetId: { in: ids } } }),
    prisma.jobApplication.deleteMany({ where: { job: { listingId: { in: ids } } } }),
    prisma.listing.deleteMany({ where: { id: { in: ids } } }),
    prisma.provider.deleteMany({ where: { isDemo: true } }),
    prisma.attachment.deleteMany({ where: { owner: { isDemo: true } } }),
    prisma.user.deleteMany({ where: { isDemo: true } }),
  ]);
}

async function createDemoUser(email: string, name: string, roles: Prisma.UserRoleCreateWithoutUserInput[], withPassword: boolean) {
  const id = randomUUID();
  return prisma.user.create({
    data: {
      id,
      authSubject: `local:${id}`,
      email,
      name,
      isDemo: true,
      city: "Frisco",
      state: "TX",
      roles: { create: roles },
      localCredential: withPassword ? { create: { passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10) } } : undefined,
      consents: { create: [{ type: "TERMS", granted: true }, { type: "PRIVACY", granted: true }] },
    },
  });
}

async function createLocation(city: string, seed: string, addressLine?: string) {
  const c = cityCoords(city);
  return prisma.location.create({
    data: {
      city, state: c.state, addressLine: addressLine ?? null,
      latitude: c.lat + jitter(seed), longitude: c.lng + jitter(`${seed}-lng`),
      showExact: false,
    },
  });
}

async function seedDemo() {
  await clearDemoData();
  const categories = await prisma.category.findMany();
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const cat = (slug: string) => {
    const c = bySlug.get(slug);
    if (!c) throw new Error(`Unknown category ${slug}`);
    return c;
  };

  const admin = await createDemoUser(DEMO_ACCOUNTS.admin.email, DEMO_ACCOUNTS.admin.name, [{ role: "ADMIN" }, { role: "CONSUMER" }], true);
  const providerUser = await createDemoUser(
    DEMO_ACCOUNTS.provider.email, DEMO_ACCOUNTS.provider.name,
    [{ role: "CONSUMER" }, { role: "PROVIDER" }, { role: "ORGANIZER" }, { role: "EMPLOYER" }, { role: "ADVERTISER" }], true,
  );
  const consumer = await createDemoUser(DEMO_ACCOUNTS.user.email, DEMO_ACCOUNTS.user.name, [{ role: "CONSUMER" }], true);

  const now = Date.now();
  const createdListings: { id: string; title: string; category: string }[] = [];

  // ---- service providers + listings
  for (const [index, s] of DEMO_SERVICES.entries()) {
    const owner =
      s.category === "home-services" && s.sub === "hvac"
        ? providerUser
        : await createDemoUser(`demo-provider-${index + 1}@desiconnect.example`, `${s.businessName} owner`, [{ role: "CONSUMER" }, { role: "PROVIDER" }], false);
    const location = await createLocation(s.city, s.businessName);
    const parent = cat(s.category);
    const listingCategory = s.sub ? cat(s.sub) : parent;
    const provider = await prisma.provider.create({
      data: {
        ownerId: owner.id,
        businessName: s.businessName,
        description: s.description,
        email: `contact+${index + 1}@desiconnect.example`,
        phone: `(214) 555-01${String(index).padStart(2, "0")}`,
        languages: s.languages,
        verification: s.verification,
        verifiedAt: s.verification === "VERIFIED" ? new Date() : null,
        isDemo: true,
        categories: { create: [{ categoryId: parent.id }] },
        locations: { create: [{ locationId: location.id, serviceRadiusMiles: 25, isPrimary: true }] },
        credentials: s.credential
          ? {
              create: [{
                type: s.credential,
                jurisdiction: "TX",
                licenseNumber: `DEMO-${String(10000 + index * 37)}`,
                issuingAuthority: "Demonstration data — not a real license",
                reviewStatus: s.verification === "VERIFIED" ? "VERIFIED" : "PENDING",
                reviewedAt: s.verification === "VERIFIED" ? new Date() : null,
                reviewedById: s.verification === "VERIFIED" ? admin.id : null,
              }],
            }
          : undefined,
      },
    });
    const id = randomUUID();
    await prisma.listing.create({
      data: {
        id,
        slug: listingSlug(s.title, id),
        ownerId: owner.id,
        providerId: provider.id,
        categoryId: listingCategory.id,
        kind: parent.kind,
        title: s.title,
        description: s.description,
        locationId: location.id,
        languages: s.languages,
        contactEmail: provider.email,
        contactPhone: provider.phone,
        priceText: s.priceText ?? null,
        tags: s.tags ?? [],
        status: s.pending ? "PENDING_REVIEW" : "PUBLISHED",
        isDemo: true,
        source: "seed:demo",
        submittedAt: new Date(now - (index + 1) * 3600_000),
        publishedAt: s.pending ? null : new Date(now - (index + 1) * 3600_000),
      },
    });
    createdListings.push({ id, title: s.title, category: s.category });
  }

  // ---- events (organized by the demo provider account)
  for (const e of DEMO_EVENTS) {
    const location = await createLocation(e.city, e.title, e.venue);
    const start = new Date(now + e.inDays * 86_400_000);
    start.setUTCHours(e.hour + 6, 0, 0, 0); // Central time ≈ UTC-6 in winter; demo precision is fine.
    const id = randomUUID();
    await prisma.listing.create({
      data: {
        id, slug: listingSlug(e.title, id), ownerId: providerUser.id, categoryId: cat(e.sub).id, kind: "EVENT",
        title: e.title, description: e.description, locationId: location.id, languages: e.languages,
        contactEmail: DEMO_ACCOUNTS.provider.email, priceText: e.isFree ? "Free" : (e.priceText ?? null),
        status: "PUBLISHED", isDemo: true, source: "seed:demo", submittedAt: new Date(), publishedAt: new Date(),
        event: {
          create: {
            startAt: start, endAt: new Date(start.getTime() + e.durationHours * 3600_000),
            venue: e.venue, capacity: e.capacity ?? null, isFree: e.isFree,
          },
        },
      },
    });
    createdListings.push({ id, title: e.title, category: "events" });
  }

  // ---- jobs
  for (const j of DEMO_JOBS) {
    const location = await createLocation(j.city, j.title);
    const id = randomUUID();
    const salary =
      j.salaryMin && j.salaryMax
        ? `$${j.salaryMin.toLocaleString("en-US")}–$${j.salaryMax.toLocaleString("en-US")} / ${j.salaryPeriod?.toLowerCase()}`
        : null;
    await prisma.listing.create({
      data: {
        id, slug: listingSlug(j.title, id), ownerId: providerUser.id, categoryId: cat(j.sub).id, kind: "JOB",
        title: j.title, description: j.description, locationId: location.id, languages: ["English"],
        contactEmail: DEMO_ACCOUNTS.provider.email, priceText: salary, priceValue: j.salaryMax ?? null, tags: j.skills,
        status: "PUBLISHED", isDemo: true, source: "seed:demo", submittedAt: new Date(), publishedAt: new Date(),
        job: {
          create: {
            company: j.company, employmentType: j.employmentType, workArrangement: j.workArrangement,
            salaryMin: j.salaryMin ?? null, salaryMax: j.salaryMax ?? null, salaryPeriod: j.salaryPeriod ?? null, skills: j.skills,
          },
        },
      },
    });
    createdListings.push({ id, title: j.title, category: "jobs" });
  }

  // ---- properties
  for (const p of DEMO_PROPERTIES) {
    const location = await createLocation(p.city, p.title);
    const id = randomUUID();
    const priceText = p.transactionType === "SALE" ? `$${p.price.toLocaleString("en-US")}` : `$${p.price.toLocaleString("en-US")} / month`;
    await prisma.listing.create({
      data: {
        id, slug: listingSlug(p.title, id), ownerId: providerUser.id, categoryId: cat(p.sub).id, kind: "PROPERTY",
        title: p.title, description: p.description, locationId: location.id, languages: ["English"],
        contactEmail: DEMO_ACCOUNTS.provider.email, priceText, priceValue: p.price,
        status: "PUBLISHED", isDemo: true, source: "seed:demo", submittedAt: new Date(), publishedAt: new Date(),
        property: {
          create: {
            transactionType: p.transactionType, propertyType: p.propertyType, price: p.price, beds: p.beds, baths: p.baths,
            sqft: p.sqft ?? null, availableFrom: p.availableInDays ? new Date(now + p.availableInDays * 86_400_000) : null,
          },
        },
      },
    });
    createdListings.push({ id, title: p.title, category: "real-estate" });
  }

  // ---- sample activity so dashboards are not empty
  const hvac = createdListings.find((l) => l.title.startsWith("AC repair"));
  const diwali = createdListings.find((l) => l.title.startsWith("Diwali"));
  const caterer = createdListings.find((l) => l.title.startsWith("Indian catering"));
  if (hvac) {
    await prisma.inquiry.create({
      data: {
        listingId: hvac.id, requesterId: consumer.id, preferredContact: "PHONE", phone: "(214) 555-0199",
        message: "Demo inquiry: our upstairs AC is blowing warm air. Could someone come out this week?",
      },
    });
    await prisma.consentRecord.create({ data: { userId: consumer.id, type: "CONTACT_SHARING", granted: true, context: "demo-inquiry" } });
  }
  if (diwali) await prisma.eventRegistration.create({ data: { eventId: diwali.id, userId: consumer.id, guests: 3 } });
  if (caterer) {
    await prisma.favorite.create({ data: { userId: consumer.id, listingId: caterer.id } });
    await prisma.report.create({
      data: {
        reporterId: consumer.id, targetType: "LISTING", targetId: caterer.id, reason: "MISLEADING",
        details: "Demo report: pricing on the listing does not match the quote I received.",
      },
    });
  }

  const total = await prisma.listing.count({ where: { isDemo: true } });
  console.log(`✓ ${total} demo listings (all flagged isDemo and labeled "(Demo)")`);
  console.log(`  Demo sign-ins (password: ${DEMO_PASSWORD}):`);
  for (const a of Object.values(DEMO_ACCOUNTS)) console.log(`   - ${a.email}`);
}

/** Real DFW Indian and Pakistani restaurants from public listings (see restaurants.ts). Not demo data. */
export const RESTAURANT_SOURCE = "import:dfw-restaurants";
const DIRECTORY_EMAIL = "directory@desiconnect.example";

export function restaurantDescription(r: RestaurantSeed): string {
  const kind = r.cuisine === "Indian & Pakistani" ? "Indian and Pakistani" : r.cuisine;
  const styles = (r.styles ?? []).filter((s) => !["Indian", "Pakistani"].includes(s));
  return [
    `${r.name} serves ${kind} food in ${r.city}, Texas.${styles.length ? ` Known for: ${styles.join(", ").toLowerCase()}.` : ""}`,
    "DesiConnect listed this restaurant from public information. The restaurant hasn't claimed or confirmed this listing yet, so check the address and hours before you go.",
    "Own this restaurant? Contact DesiConnect to claim the listing and keep it up to date.",
  ].join("\n\n");
}

async function seedRestaurants() {
  const categories = await prisma.category.findMany({ where: { slug: { in: ["restaurants"] } } });
  const restaurants = categories[0];
  if (!restaurants) throw new Error("Category 'restaurants' is missing; run seedCategories first");
  const owner =
    (await prisma.user.findUnique({ where: { email: DIRECTORY_EMAIL } })) ??
    (await prisma.user.create({
      data: { id: randomUUID(), authSubject: `system:directory`, email: DIRECTORY_EMAIL, name: "DesiConnect directory", isDemo: false, roles: { create: [{ role: "CONSUMER" }] } },
    }));
  // Replace the previous import so the list stays in sync with restaurants.ts.
  const old = await prisma.listing.findMany({ where: { source: { startsWith: RESTAURANT_SOURCE } }, select: { id: true, locationId: true } });
  if (old.length) {
    await prisma.listing.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
    await prisma.location.deleteMany({ where: { id: { in: old.map((o) => o.locationId) } } });
  }
  const now = Date.now();
  for (const [i, r] of RESTAURANTS.entries()) {
    const location = await createLocation(r.city, r.name, r.address);
    const id = randomUUID();
    await prisma.listing.create({
      data: {
        id,
        slug: listingSlug(r.name, id),
        ownerId: owner.id,
        categoryId: restaurants.id,
        kind: "SERVICE",
        title: r.name,
        description: restaurantDescription(r),
        locationId: location.id,
        languages: [],
        contactPhone: r.phone ?? null,
        priceText: null,
        tags: [...new Set([...(r.cuisine === "Indian & Pakistani" ? ["Indian", "Pakistani"] : [r.cuisine]), ...(r.styles ?? [])])],
        status: "PUBLISHED",
        isDemo: false,
        source: `${RESTAURANT_SOURCE}:${r.source}`.slice(0, 500),
        submittedAt: new Date(now - i * 60_000),
        publishedAt: new Date(now - i * 60_000),
      },
    });
  }
  console.log(`✓ ${RESTAURANTS.length} DFW Indian and Pakistani restaurants (from public listings, unclaimed)`);
}

async function main() {
  await seedCategories();
  await seedGeo();
  if (process.env.SEED_RESTAURANTS !== "false") await seedRestaurants();
  const demoFlag = process.env.SEED_DEMO;
  const isProd = process.env.NODE_ENV === "production";
  if (demoFlag === "false" || (isProd && demoFlag !== "true")) {
    console.log("• Demo data skipped");
    return;
  }
  await seedDemo();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
