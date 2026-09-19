/**
 * Deterministic audit engine.
 *
 * Takes extracted bill line items + the drug database and returns a fully
 * structured audit report: per-line verdict, overcharge amounts, generic
 * alternatives, regulatory citations, and annual cost projection.
 *
 * ZERO LLM involvement — all math is deterministic.
 */

import type { BillLineItem, DrugEntry } from "@/data/schemas";
import type { AuditReport, AuditLineResult } from "@/data/schemas";
import { matchDrug } from "./drug-matcher";

/**
 * Find the cheapest generic alternative for a matched drug.
 * Looks for other entries with the same base generic name (first word)
 * and the same strength.
 */
function findGenericAlternative(
  matchedEntry: DrugEntry,
  database: DrugEntry[]
): { name: string; price: number } | null {
  // Find the base salt name (first component before any "+")
  const baseSalt = matchedEntry.genericName.split("+")[0].trim().split(" ")[0];

  // Look for entries with the same generic base and strength
  let cheapest: DrugEntry | null = null;
  for (const entry of database) {
    if (
      entry.id !== matchedEntry.id &&
      entry.genericName.startsWith(baseSalt) &&
      entry.strength === matchedEntry.strength
    ) {
      if (!cheapest || entry.ceilingPricePerPack < cheapest.ceilingPricePerPack) {
        cheapest = entry;
      }
    }
  }

  if (cheapest) {
    return {
      name: cheapest.genericName,
      price: cheapest.ceilingPricePerPack,
    };
  }

  // If no separate generic entry, the matched entry itself is the generic reference
  return {
    name: matchedEntry.genericName,
    price: matchedEntry.ceilingPricePerPack,
  };
}

/**
 * Audit a single bill line item against the drug database.
 */
function auditLineItem(
  item: BillLineItem,
  database: DrugEntry[]
): AuditLineResult {
  // Handle edge cases
  if (!item.drugName || item.quantity <= 0) {
    return {
      drugName: item.drugName || "Unknown",
      quantity: item.quantity,
      billedUnitPrice: item.unitPrice,
      billedLineTotal: item.lineTotal,
      matched: false,
      matchedDrugId: null,
      matchedGenericName: null,
      ceilingPricePerUnit: null,
      ceilingPriceForQty: null,
      overchargePerUnit: null,
      overchargeForLine: null,
      isOvercharged: false,
      genericAlternative: null,
      genericPrice: null,
      janAushadhiPrice: null,
      potentialSaving: null,
      regulatoryBasis: null,
      verdict: "UNVERIFIED",
    };
  }

  const matchResult = matchDrug(item.drugName, database);

  if (!matchResult.matched) {
    return {
      drugName: item.drugName,
      quantity: item.quantity,
      billedUnitPrice: item.unitPrice,
      billedLineTotal: item.lineTotal,
      matched: false,
      matchedDrugId: null,
      matchedGenericName: null,
      ceilingPricePerUnit: null,
      ceilingPriceForQty: null,
      overchargePerUnit: null,
      overchargeForLine: null,
      isOvercharged: false,
      genericAlternative: null,
      genericPrice: null,
      janAushadhiPrice: null,
      potentialSaving: null,
      regulatoryBasis: null,
      verdict: "UNVERIFIED",
    };
  }

  const entry = matchResult.drugEntry;
  const ceilingPricePerUnit = entry.ceilingPricePerUnit;
  const ceilingPriceForQty = roundTo2(ceilingPricePerUnit * item.quantity);

  // Calculate overcharge
  const overchargePerUnit = roundTo2(
    Math.max(0, item.unitPrice - ceilingPricePerUnit)
  );
  const overchargeForLine = roundTo2(overchargePerUnit * item.quantity);
  const isOvercharged = overchargePerUnit > 0;

  // Find generic alternative
  const generic = findGenericAlternative(entry, database);
  const genericAlternative = generic ? generic.name : null;
  const genericPrice = generic ? generic.price : null;

  // Calculate potential saving (billed total vs ceiling price total)
  const potentialSaving = isOvercharged ? overchargeForLine : null;

  return {
    drugName: item.drugName,
    quantity: item.quantity,
    billedUnitPrice: item.unitPrice,
    billedLineTotal: item.lineTotal,
    matched: true,
    matchedDrugId: entry.id,
    matchedGenericName: entry.genericName,
    ceilingPricePerUnit,
    ceilingPriceForQty,
    overchargePerUnit: isOvercharged ? overchargePerUnit : null,
    overchargeForLine: isOvercharged ? overchargeForLine : null,
    isOvercharged,
    genericAlternative,
    genericPrice,
    janAushadhiPrice: entry.janAushadhiPrice,
    potentialSaving,
    regulatoryBasis: entry.regulatoryBasis,
    verdict: isOvercharged ? "OVERCHARGED" : "FAIR",
  };
}

/**
 * Round a number to 2 decimal places.
 */
function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Main audit function: takes extracted bill line items + the drug database
 * and returns a fully structured audit report.
 *
 * This function is PURE and DETERMINISTIC — no LLM involvement whatsoever.
 */
export function auditBill(
  billLineItems: BillLineItem[],
  drugDatabase: DrugEntry[]
): AuditReport {
  const lineResults = billLineItems.map((item) =>
    auditLineItem(item, drugDatabase)
  );

  // Calculate totals
  const totalBilled = roundTo2(
    lineResults.reduce((sum, r) => sum + r.billedLineTotal, 0)
  );

  const totalCeilingValue = roundTo2(
    lineResults.reduce((sum, r) => sum + (r.ceilingPriceForQty ?? r.billedLineTotal), 0)
  );

  const totalOvercharge = roundTo2(
    lineResults.reduce((sum, r) => sum + (r.overchargeForLine ?? 0), 0)
  );

  // Annual projection: overcharge × 12 (assuming monthly refills)
  const estimatedAnnualOvercharge = roundTo2(totalOvercharge * 12);

  // Determine overall verdict
  const hasOvercharged = lineResults.some((r) => r.verdict === "OVERCHARGED");
  const hasUnverified = lineResults.some((r) => r.verdict === "UNVERIFIED");
  const allFair = lineResults.every(
    (r) => r.verdict === "FAIR" || r.verdict === "UNVERIFIED"
  );

  let verdict: "OVERCHARGED" | "CLEAR" | "PARTIAL";
  if (hasOvercharged && hasUnverified) {
    verdict = "PARTIAL";
  } else if (hasOvercharged) {
    verdict = "OVERCHARGED";
  } else if (allFair && !hasUnverified) {
    verdict = "CLEAR";
  } else {
    verdict = "PARTIAL";
  }

  return {
    verdict,
    totalBilled,
    totalCeilingValue,
    totalOvercharge,
    estimatedAnnualOvercharge,
    lineResults,
  };
}
