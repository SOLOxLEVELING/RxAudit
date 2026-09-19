/**
 * Drug database validation script.
 * Run with: npx tsx src/data/validate.ts
 */

import drugDatabaseRaw from "./drug-database.json";
import { DrugEntrySchema } from "./schemas";
import { z } from "zod";

const DrugDatabaseSchema = z.array(DrugEntrySchema);

console.log(`\nValidating drug database (${drugDatabaseRaw.length} entries)...\n`);

const result = DrugDatabaseSchema.safeParse(drugDatabaseRaw);

if (!result.success) {
  console.error("❌ Validation FAILED:\n");
  const formatted = result.error.format();
  console.error(JSON.stringify(formatted, null, 2));
  process.exit(1);
}

// Count by category
const categories: Record<string, number> = {};
for (const entry of result.data) {
  categories[entry.category] = (categories[entry.category] || 0) + 1;
}

// Verify ceiling price math
let mathErrors = 0;
for (const entry of result.data) {
  const expected = +(entry.ceilingPricePerUnit * entry.packSize).toFixed(2);
  const actual = entry.ceilingPricePerPack;
  if (Math.abs(expected - actual) > 0.05) {
    console.error(
      `⚠️  Math mismatch: ${entry.id} — expected ceilingPricePerPack=${expected}, got ${actual}`
    );
    mathErrors++;
  }
}

// Check for duplicate IDs
const ids = result.data.map((e) => e.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupes.length > 0) {
  console.error(`⚠️  Duplicate IDs found: ${dupes.join(", ")}`);
}

console.log(`✅ All ${result.data.length} entries pass Zod validation`);
console.log(`\n📊 Category breakdown:`);
for (const [cat, count] of Object.entries(categories).sort()) {
  console.log(`   ${cat}: ${count} entries`);
}
console.log(`\n🧮 Ceiling price math check: ${mathErrors === 0 ? "✅ All correct" : `❌ ${mathErrors} errors`}`);
console.log(`🔑 Duplicate ID check: ${dupes.length === 0 ? "✅ No duplicates" : `❌ ${dupes.length} duplicates`}`);
console.log();

if (mathErrors > 0 || dupes.length > 0) {
  process.exit(1);
}
