import {
  db,
  touristPlacesTable,
  touristPlaceConnectionsTable,
} from "@workspace/db";

async function main() {
  console.log("Checking existing connections...");
  const existing = await db
    .select({ id: touristPlaceConnectionsTable.id })
    .from(touristPlaceConnectionsTable)
    .limit(1);

  if (existing.length > 0) {
    console.log("Connections already seeded. Exiting.");
    process.exit(0);
  }

  const allPlaces = await db
    .select({ id: touristPlacesTable.id, slug: touristPlacesTable.slug })
    .from(touristPlacesTable);

  const bySlug = Object.fromEntries(allPlaces.map((p) => [p.slug, p.id]));
  console.log("Found places:", Object.keys(bySlug).join(", "));

  const CONNECTIONS: Array<[string, string, number, number]> = [
    ["taj-mahal", "agra-fort", 2.5, 10],
    ["taj-mahal", "fatehpur-sikri", 40, 60],
    ["taj-mahal", "mehtab-bagh", 1.5, 8],
    ["taj-mahal", "itimad-ud-daulah", 5.5, 20],
    ["taj-mahal", "sikandra", 10, 30],
    ["taj-mahal", "chini-ka-rauza", 5.0, 18],
    ["taj-mahal", "jama-masjid-agra", 2.8, 12],
    ["agra-fort", "fatehpur-sikri", 38, 58],
    ["agra-fort", "mehtab-bagh", 4.0, 15],
    ["agra-fort", "itimad-ud-daulah", 7.0, 25],
    ["agra-fort", "sikandra", 8.5, 28],
    ["agra-fort", "chini-ka-rauza", 6.5, 22],
    ["agra-fort", "jama-masjid-agra", 0.8, 5],
    ["fatehpur-sikri", "mehtab-bagh", 41, 62],
    ["fatehpur-sikri", "itimad-ud-daulah", 46, 70],
    ["fatehpur-sikri", "sikandra", 50, 75],
    ["fatehpur-sikri", "chini-ka-rauza", 45, 68],
    ["fatehpur-sikri", "jama-masjid-agra", 38, 58],
    ["mehtab-bagh", "itimad-ud-daulah", 6.5, 23],
    ["mehtab-bagh", "sikandra", 11, 33],
    ["mehtab-bagh", "chini-ka-rauza", 5.5, 20],
    ["mehtab-bagh", "jama-masjid-agra", 4.0, 15],
    ["itimad-ud-daulah", "sikandra", 14, 42],
    ["itimad-ud-daulah", "chini-ka-rauza", 1.0, 5],
    ["itimad-ud-daulah", "jama-masjid-agra", 7.0, 25],
    ["sikandra", "chini-ka-rauza", 12, 36],
    ["sikandra", "jama-masjid-agra", 9.0, 28],
    ["chini-ka-rauza", "jama-masjid-agra", 6.0, 22],
  ];

  let count = 0;
  let skipped = 0;
  for (const [fromSlug, toSlug, distKm, timeMin] of CONNECTIONS) {
    const fromId = bySlug[fromSlug];
    const toId = bySlug[toSlug];
    if (!fromId || !toId) {
      console.warn(`  Skipping: ${fromSlug} → ${toSlug} (place not found)`);
      skipped++;
      continue;
    }
    await db
      .insert(touristPlaceConnectionsTable)
      .values({
        fromPlaceId: fromId,
        toPlaceId: toId,
        distanceKm: String(distKm),
        estimatedTimeMinutes: timeMin,
      })
      .onConflictDoNothing();
    console.log(`  ✓ ${fromSlug} ↔ ${toSlug}: ${distKm} km, ${timeMin} min`);
    count++;
  }

  console.log(`\nDone! Seeded ${count} connections, skipped ${skipped}.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
