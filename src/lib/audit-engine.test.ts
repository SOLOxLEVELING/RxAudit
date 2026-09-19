/**
 * Audit engine test script.
 * Run with: npx tsx src/lib/audit-engine.test.ts
 *
 * Tests the audit engine against all 3 sample bills from Phase 1.
 */

import { drugDatabase } from "../data/index";
import { auditBill } from "./audit-engine";
import { matchDrug } from "./drug-matcher";
import {
  sampleBPBill,
  sampleDiabetesBill,
  sampleCleanBill,
} from "../data/sample-bills";

const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});

function fmt(n: number): string {
  return formatter.format(n);
}

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, message: string): void {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ ${message}`);
  } else {
    console.log(`  ❌ FAIL: ${message}`);
  }
}

// ────────────────────────────────────────────────
// Test: Drug Matcher
// ────────────────────────────────────────────────
console.log("\n🔍 DRUG MATCHER TESTS\n");

const matchTests = [
  { input: "TELMI 40", expectedGeneric: "Telmisartan", expectedStrength: "40 mg" },
  { input: "AMLODAC 5", expectedGeneric: "Amlodipine", expectedStrength: "5 mg" },
  { input: "ECOSPRIN 75", expectedGeneric: "Aspirin", expectedStrength: "75 mg" },
  { input: "ATORVA 10", expectedGeneric: "Atorvastatin", expectedStrength: "10 mg" },
  { input: "GLYCOMET GP 2", expectedGeneric: "Metformin + Glimepiride", expectedStrength: "500 mg + 2 mg" },
  { input: "GLYCOMET SR 1000", expectedGeneric: "Metformin Hydrochloride SR", expectedStrength: "1000 mg" },
  { input: "CARDACE 5", expectedGeneric: "Ramipril", expectedStrength: "5 mg" },
  { input: "AMLONG 5", expectedGeneric: "Amlodipine", expectedStrength: "5 mg" },
  { input: "ATEN 50", expectedGeneric: "Atenolol", expectedStrength: "50 mg" },
  { input: "GLYCOMET 500", expectedGeneric: "Metformin", expectedStrength: "500 mg" },
  { input: "JANUVIA 100", expectedGeneric: "Sitagliptin", expectedStrength: "100 mg" },
  { input: "ATORVA 20", expectedGeneric: "Atorvastatin", expectedStrength: "20 mg" },
  { input: "UNKNOWN DRUG XYZ", expectedGeneric: null, expectedStrength: null },
];

for (const test of matchTests) {
  const result = matchDrug(test.input, drugDatabase);
  if (test.expectedGeneric === null) {
    assert(
      !result.matched,
      `"${test.input}" → correctly returned no match`
    );
  } else {
    if (result.matched) {
      const genericMatch = result.drugEntry.genericName.includes(
        test.expectedGeneric.split(" ")[0]
      );
      const strengthMatch = result.drugEntry.strength === test.expectedStrength;
      assert(
        genericMatch && strengthMatch,
        `"${test.input}" → ${result.drugEntry.genericName} ${result.drugEntry.strength} [${result.matchConfidence}]` +
          (!strengthMatch ? ` (WRONG: expected strength "${test.expectedStrength}")` : "")
      );
    } else {
      assert(false, `"${test.input}" → expected match to "${test.expectedGeneric}" but got no match: ${result.reason}`);
    }
  }
}

// ────────────────────────────────────────────────
// Test 1: Overcharged BP Bill
// ────────────────────────────────────────────────
console.log("\n📋 TEST 1: Overcharged BP Bill\n");

const bpResult = auditBill(sampleBPBill.lineItems, drugDatabase);

console.log(`  Verdict: ${bpResult.verdict}`);
console.log(`  Total Billed: ${fmt(bpResult.totalBilled)}`);
console.log(`  Total Ceiling Value: ${fmt(bpResult.totalCeilingValue)}`);
console.log(`  Total Overcharge: ${fmt(bpResult.totalOvercharge)}`);
console.log(`  Annual Impact: ${fmt(bpResult.estimatedAnnualOvercharge)}`);
console.log();

assert(
  bpResult.verdict === "OVERCHARGED",
  `BP bill verdict is OVERCHARGED (got: ${bpResult.verdict})`
);

// Check that overcharged items are flagged
const bpOvercharged = bpResult.lineResults.filter(
  (r) => r.verdict === "OVERCHARGED"
);
assert(
  bpOvercharged.length >= 2,
  `At least 2 items flagged as overcharged (got: ${bpOvercharged.length})`
);

assert(
  bpResult.totalOvercharge > 0,
  `Total overcharge is positive: ${fmt(bpResult.totalOvercharge)}`
);

assert(
  Math.abs(bpResult.estimatedAnnualOvercharge - bpResult.totalOvercharge * 12) < 0.01,
  `Annual impact is 12x overcharge: ${fmt(bpResult.estimatedAnnualOvercharge)}`
);

// Check TELMI 40 is flagged (billed at 7.22/unit, ceiling is 5.42/unit)
const telmiResult = bpResult.lineResults.find((r) =>
  r.drugName.includes("TELMI")
);
if (telmiResult) {
  assert(
    telmiResult.isOvercharged === true,
    `TELMI 40 is overcharged (billed ${fmt(telmiResult.billedUnitPrice)}/unit, ceiling ${fmt(telmiResult.ceilingPricePerUnit!)})`
  );
  assert(
    telmiResult.matchedGenericName !== null,
    `TELMI 40 matched to generic: ${telmiResult.matchedGenericName}`
  );
  assert(
    telmiResult.regulatoryBasis !== null,
    `TELMI 40 has regulatory citation: ${telmiResult.regulatoryBasis}`
  );
}

// Check AMLODAC 5 is flagged (billed at 5.80/unit, ceiling is 2.56/unit)
const amloResult = bpResult.lineResults.find((r) =>
  r.drugName.includes("AMLODAC")
);
if (amloResult) {
  assert(
    amloResult.isOvercharged === true,
    `AMLODAC 5 is overcharged (billed ${fmt(amloResult.billedUnitPrice)}/unit, ceiling ${fmt(amloResult.ceilingPricePerUnit!)})`
  );
}

// Check ECOSPRIN 75 is fair (billed at 0.36/unit, ceiling is 0.36/unit)
const ecoResult = bpResult.lineResults.find((r) =>
  r.drugName.includes("ECOSPRIN 75")
);
if (ecoResult) {
  assert(
    ecoResult.isOvercharged === false || ecoResult.verdict === "FAIR",
    `ECOSPRIN 75 is FAIR (billed ${fmt(ecoResult.billedUnitPrice)}/unit, ceiling ${fmt(ecoResult.ceilingPricePerUnit!)})`
  );
}

// Print line-by-line details
console.log("\n  Line-by-line breakdown:");
for (const line of bpResult.lineResults) {
  const status =
    line.verdict === "OVERCHARGED"
      ? "🔴"
      : line.verdict === "FAIR"
      ? "🟢"
      : "⚪";
  console.log(
    `    ${status} ${line.drugName} (qty ${line.quantity}): billed ${fmt(line.billedLineTotal)}` +
      (line.matched
        ? ` → ceiling ${fmt(line.ceilingPriceForQty!)}` +
          (line.isOvercharged
            ? ` → OVERCHARGE ${fmt(line.overchargeForLine!)}`
            : " → FAIR")
        : " → UNVERIFIED")
  );
  if (line.genericAlternative) {
    console.log(
      `      Generic: ${line.genericAlternative} (${fmt(line.genericPrice!)})`
    );
  }
}

// ────────────────────────────────────────────────
// Test 2: Diabetes Multi-Strip Bill
// ────────────────────────────────────────────────
console.log("\n\n📋 TEST 2: Diabetes Multi-Strip Bill\n");

const diabetesResult = auditBill(sampleDiabetesBill.lineItems, drugDatabase);

console.log(`  Verdict: ${diabetesResult.verdict}`);
console.log(`  Total Billed: ${fmt(diabetesResult.totalBilled)}`);
console.log(`  Total Ceiling Value: ${fmt(diabetesResult.totalCeilingValue)}`);
console.log(`  Total Overcharge: ${fmt(diabetesResult.totalOvercharge)}`);
console.log(`  Annual Impact: ${fmt(diabetesResult.estimatedAnnualOvercharge)}`);
console.log();

assert(
  diabetesResult.verdict === "OVERCHARGED",
  `Diabetes bill verdict is OVERCHARGED (got: ${diabetesResult.verdict})`
);

const diabetesOvercharged = diabetesResult.lineResults.filter(
  (r) => r.verdict === "OVERCHARGED"
);
assert(
  diabetesOvercharged.length >= 2,
  `At least 2 items flagged as overcharged (got: ${diabetesOvercharged.length})`
);

assert(
  diabetesResult.totalOvercharge > 0,
  `Total overcharge is positive: ${fmt(diabetesResult.totalOvercharge)}`
);

// Print line-by-line details
console.log("\n  Line-by-line breakdown:");
for (const line of diabetesResult.lineResults) {
  const status =
    line.verdict === "OVERCHARGED"
      ? "🔴"
      : line.verdict === "FAIR"
      ? "🟢"
      : "⚪";
  console.log(
    `    ${status} ${line.drugName} (qty ${line.quantity}): billed ${fmt(line.billedLineTotal)}` +
      (line.matched
        ? ` → ceiling ${fmt(line.ceilingPriceForQty!)}` +
          (line.isOvercharged
            ? ` → OVERCHARGE ${fmt(line.overchargeForLine!)}`
            : " → FAIR")
        : " → UNVERIFIED")
  );
}

// ────────────────────────────────────────────────
// Test 3: Clean Bill (No Issues)
// ────────────────────────────────────────────────
console.log("\n\n📋 TEST 3: Clean Bill (No Issues)\n");

const cleanResult = auditBill(sampleCleanBill.lineItems, drugDatabase);

console.log(`  Verdict: ${cleanResult.verdict}`);
console.log(`  Total Billed: ${fmt(cleanResult.totalBilled)}`);
console.log(`  Total Ceiling Value: ${fmt(cleanResult.totalCeilingValue)}`);
console.log(`  Total Overcharge: ${fmt(cleanResult.totalOvercharge)}`);
console.log(`  Annual Impact: ${fmt(cleanResult.estimatedAnnualOvercharge)}`);
console.log();

assert(
  cleanResult.verdict === "CLEAR",
  `Clean bill verdict is CLEAR (got: ${cleanResult.verdict})`
);

assert(
  cleanResult.totalOvercharge === 0,
  `Total overcharge is zero: ${fmt(cleanResult.totalOvercharge)}`
);

const cleanOvercharged = cleanResult.lineResults.filter(
  (r) => r.verdict === "OVERCHARGED"
);
assert(
  cleanOvercharged.length === 0,
  `No items flagged as overcharged (got: ${cleanOvercharged.length})`
);

// Print line-by-line details
console.log("\n  Line-by-line breakdown:");
for (const line of cleanResult.lineResults) {
  const status =
    line.verdict === "OVERCHARGED"
      ? "🔴"
      : line.verdict === "FAIR"
      ? "🟢"
      : "⚪";
  console.log(
    `    ${status} ${line.drugName} (qty ${line.quantity}): billed ${fmt(line.billedLineTotal)}` +
      (line.matched
        ? ` → ceiling ${fmt(line.ceilingPriceForQty!)}` +
          (line.isOvercharged
            ? ` → OVERCHARGE ${fmt(line.overchargeForLine!)}`
            : " → FAIR")
        : " → UNVERIFIED")
  );
}

// ────────────────────────────────────────────────
// Test: Edge Cases
// ────────────────────────────────────────────────
console.log("\n\n📋 EDGE CASE TESTS\n");

// Empty drug name
const emptyResult = auditBill(
  [{ drugName: "", quantity: 10, unitPrice: 5, lineTotal: 50 }],
  drugDatabase
);
assert(
  emptyResult.lineResults[0].verdict === "UNVERIFIED",
  "Empty drug name → UNVERIFIED"
);

// Zero quantity
const zeroQtyResult = auditBill(
  [{ drugName: "ATORVA 10", quantity: 0, unitPrice: 5, lineTotal: 0 }],
  drugDatabase
);
assert(
  zeroQtyResult.lineResults[0].verdict === "UNVERIFIED",
  "Zero quantity → UNVERIFIED"
);

// Drug not in database
const unknownResult = auditBill(
  [{ drugName: "MYSTERIODRUG 500", quantity: 10, unitPrice: 50, lineTotal: 500 }],
  drugDatabase
);
assert(
  unknownResult.lineResults[0].verdict === "UNVERIFIED",
  "Unknown drug → UNVERIFIED"
);

// Missing price (0 unit price, still matches)
const zeroPriceResult = auditBill(
  [{ drugName: "ATORVA 10", quantity: 15, unitPrice: 0, lineTotal: 0 }],
  drugDatabase
);
assert(
  zeroPriceResult.lineResults[0].verdict === "FAIR",
  "Zero price → FAIR (below ceiling)"
);

// ────────────────────────────────────────────────
// Summary
// ────────────────────────────────────────────────
console.log(`\n${"═".repeat(50)}`);
console.log(
  `\n📊 RESULTS: ${passedTests}/${totalTests} tests passed ${
    passedTests === totalTests ? "✅" : "❌"
  }\n`
);

if (passedTests !== totalTests) {
  process.exit(1);
}
