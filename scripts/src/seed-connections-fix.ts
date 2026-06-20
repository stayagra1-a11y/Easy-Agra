import {
  db,
  touristPlacesTable,
  touristPlaceConnectionsTable,
} from "@workspace/db";

async function main() {
  const allPlaces = await db
    .select({ id: touristPlacesTable.id, slug: touristPlacesTable.slug })
    .from(touristPlacesTable);

  const bySlug = Object.fromEntries(allPlaces.map((p) => [p.slug, p.id]));

  const MISSING: Array<[string, string, number, number]> = [
    ["taj-mahal", "akbar-tomb-sikandra", 10, 30],
    ["agra-fort", "akbar-tomb-sikandra", 8.5, 28],
    ["fatehpur-sikri", "akbar-tomb-sikandra", 50, 75],
    ["mehtab-bagh", "akbar-tomb-sikandra", 11, 33],
    ["itimad-ud-daulah", "akbar-tomb-sikandra", 14, 42],
    ["akbar-tomb-sikandra", "chini-ka-rauza", 12, 36],
    ["akbar-tomb-sikandra", "jama-masjid-agra", 9.0, 28],
  ];

  let count = 0;
  for (const [fromSlug, toSlug, distKm, timeMin] of MISSING) {
    const fromId = bySlug[fromSlug];
    const toId = bySlug[toSlug];
    if (!fromId || !toId) {
      console.warn(`  Skipping: ${fromSlug} → ${toSlug} (not found)`);
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

  console.log(`\nAdded ${count} missing connections.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
