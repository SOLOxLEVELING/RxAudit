/**
 * Drug name matcher: maps brand names from pharmacy bills to database entries.
 *
 * Indian pharmacy bills print brand names, often abbreviated:
 * "TELMI 40", "AMLO 5", "GLYCOMET GP 1", etc.
 *
 * Strategy:
 * 1. Normalize input
 * 2. Exact brand match
 * 3. Prefix/substring brand match
 * 4. Extract strength for disambiguation
 * 5. Generic name match as fallback
 */

import type { DrugEntry } from "@/data/schemas";

export interface MatchResult {
  matched: true;
  drugEntry: DrugEntry;
  matchConfidence: "exact" | "brand-prefix" | "generic-prefix" | "fuzzy";
}

export interface NoMatchResult {
  matched: false;
  reason: string;
}

export type DrugMatchResult = MatchResult | NoMatchResult;

// Common suffixes to strip from drug names on bills
const STRIP_SUFFIXES = [
  "tab",
  "tabs",
  "tablet",
  "tablets",
  "cap",
  "caps",
  "capsule",
  "capsules",
  "strip",
  "strips",
  "sr",
  "xr",
  "xl",
  "er",
  "cr",
  "mr",
  "ec",
  "retard",
  "forte",
];

/**
 * Normalize a drug name for comparison:
 * - lowercase
 * - remove common suffixes (tab, strip, cap, etc.)
 * - collapse whitespace
 * - remove non-alphanumeric characters except spaces and dots
 */
function normalize(name: string): string {
  let n = name.toLowerCase().trim();
  // Remove parenthetical content
  n = n.replace(/\(.*?\)/g, "");
  // Remove non-alphanumeric except spaces, dots, +, /
  n = n.replace(/[^a-z0-9\s.+/]/g, " ");
  // Collapse whitespace
  n = n.replace(/\s+/g, " ").trim();
  return n;
}

/**
 * Strip common suffix tokens from a normalized drug name.
 * Returns both the stripped name and the tokens for strength extraction.
 */
function stripSuffixes(normalized: string): {
  stripped: string;
  tokens: string[];
} {
  const tokens = normalized.split(" ");
  const kept: string[] = [];

  for (const tok of tokens) {
    if (!STRIP_SUFFIXES.includes(tok)) {
      kept.push(tok);
    }
  }

  return {
    stripped: kept.join(" ").trim(),
    tokens,
  };
}

/**
 * Try to extract a strength value from a drug name string.
 * Examples:
 *   "TELMI 40" → "40 mg"
 *   "AMLO 5" → "5 mg"
 *   "GLYCOMET 1000" → "1000 mg"
 *   "THYRONORM 50" → null (could be 50 mg or 50 mcg — ambiguous)
 *   "GLYCOMET GP 2" → "2 mg" (the last number, after known brand prefix)
 */
function extractStrength(name: string): string | null {
  const normalized = normalize(name);
  // Look for patterns like "40mg", "5 mg", "0.25 mg", "40", etc.
  // First try explicit "mg" or "mcg" patterns
  const explicitMatch = normalized.match(
    /(\d+(?:\.\d+)?)\s*(mg|mcg|ml|iu)/i
  );
  if (explicitMatch) {
    return `${explicitMatch[1]} ${explicitMatch[2]}`;
  }

  // Otherwise, look for a trailing number (common in Indian brand abbreviations)
  const tokens = normalized.split(/\s+/);
  // Walk backwards to find the first numeric token
  for (let i = tokens.length - 1; i >= 0; i--) {
    const tok = tokens[i];
    if (/^\d+(\.\d+)?$/.test(tok)) {
      // Don't guess the unit — return just the number for matching
      return tok;
    }
  }

  return null;
}

/**
 * Check if an extracted strength matches a database entry's strength.
 * Handles both "5 mg" matches and bare number matches like "5" → "5 mg".
 */
function strengthMatches(
  extractedStrength: string,
  dbStrength: string
): boolean {
  const dbNorm = dbStrength.toLowerCase().replace(/\s+/g, "");
  const extNorm = extractedStrength.toLowerCase().replace(/\s+/g, "");

  // Direct match: "5mg" === "5mg"
  if (dbNorm === extNorm) return true;

  // Bare number match: "5" matches "5mg" or "5 mg"
  if (/^\d+(\.\d+)?$/.test(extNorm)) {
    // Check if the number part of the DB strength matches
    const dbNumber = dbStrength.match(/^(\d+(?:\.\d+)?)/);
    if (dbNumber && dbNumber[1] === extractedStrength) return true;
  }

  // Combo strength: "40+5" or "40 + 5" → "40 mg + 5 mg"
  if (extractedStrength.includes("+")) {
    const parts = extractedStrength.split("+").map((s) => s.trim());
    const dbParts = dbStrength
      .split("+")
      .map((s) => s.trim().replace(/\s*(mg|mcg|ml)/i, "").trim());
    if (
      parts.length === dbParts.length &&
      parts.every((p, i) => p === dbParts[i])
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Get a "base name" from a brand — remove trailing numbers and strength indicators.
 * "Telma 40" → "telma"
 * "Glycomet GP 2" → "glycomet gp"
 * "Amlong 5" → "amlong"
 */
function getBaseName(name: string): string {
  const { stripped } = stripSuffixes(normalize(name));
  // Remove trailing numbers
  return stripped.replace(/\s+\d+(\.\d+)?(\s*\+\s*\d+(\.\d+)?)*\s*$/, "").trim();
}

/**
 * Main matching function: attempts to match a bill drug name to a database entry.
 */
export function matchDrug(
  billDrugName: string,
  database: DrugEntry[]
): DrugMatchResult {
  if (!billDrugName || !billDrugName.trim()) {
    return { matched: false, reason: "empty drug name" };
  }

  const normalized = normalize(billDrugName);
  const { stripped } = stripSuffixes(normalized);
  const extractedStrength = extractStrength(billDrugName);
  const baseName = getBaseName(billDrugName);

  // === PASS 1: Exact brand match ===
  // Prefer full normalized match (preserves SR/XR/ER) over stripped match
  let strippedMatch: DrugEntry | null = null;
  for (const entry of database) {
    for (const brand of entry.commonBrands) {
      const brandNorm = normalize(brand);
      if (normalized === brandNorm) {
        return {
          matched: true,
          drugEntry: entry,
          matchConfidence: "exact",
        };
      }
      if (!strippedMatch && stripped === brandNorm) {
        strippedMatch = entry;
      }
    }
  }
  if (strippedMatch) {
    return {
      matched: true,
      drugEntry: strippedMatch,
      matchConfidence: "exact",
    };
  }

  // === PASS 2: Brand prefix match with strength disambiguation ===
  // "TELMI 40" → baseName "telmi", strength "40"
  // Look for brands that start with baseName and match the strength
  const candidatesByBrand: DrugEntry[] = [];
  for (const entry of database) {
    for (const brand of entry.commonBrands) {
      const brandBase = getBaseName(brand);
      if (
        baseName &&
        brandBase &&
        (baseName === brandBase ||
          brandBase.startsWith(baseName) ||
          baseName.startsWith(brandBase))
      ) {
        candidatesByBrand.push(entry);
        break;
      }
    }
  }

  if (candidatesByBrand.length > 0 && extractedStrength) {
    // Filter by matching strength
    const strengthFiltered = candidatesByBrand.filter((entry) =>
      strengthMatches(extractedStrength, entry.strength)
    );
    if (strengthFiltered.length === 1) {
      return {
        matched: true,
        drugEntry: strengthFiltered[0],
        matchConfidence: "brand-prefix",
      };
    }
    if (strengthFiltered.length > 1) {
      // Multiple matches — take the first one (most likely correct)
      return {
        matched: true,
        drugEntry: strengthFiltered[0],
        matchConfidence: "brand-prefix",
      };
    }
  }

  // If there's only one candidate and no strength to disambiguate, return it
  if (candidatesByBrand.length === 1) {
    return {
      matched: true,
      drugEntry: candidatesByBrand[0],
      matchConfidence: "brand-prefix",
    };
  }

  // === PASS 3: Generic name match ===
  // Try matching against genericName (e.g., "Amlodipine" or "Metformin")
  const candidatesByGeneric: DrugEntry[] = [];
  for (const entry of database) {
    const genericNorm = normalize(entry.genericName);
    const genericBase = genericNorm.split(" ")[0]; // First word of generic name
    if (
      baseName &&
      (baseName === genericNorm ||
        genericNorm.startsWith(baseName) ||
        baseName.startsWith(genericBase))
    ) {
      candidatesByGeneric.push(entry);
    }
  }

  if (candidatesByGeneric.length > 0 && extractedStrength) {
    const strengthFiltered = candidatesByGeneric.filter((entry) =>
      strengthMatches(extractedStrength, entry.strength)
    );
    if (strengthFiltered.length >= 1) {
      return {
        matched: true,
        drugEntry: strengthFiltered[0],
        matchConfidence: "generic-prefix",
      };
    }
  }

  if (candidatesByGeneric.length === 1) {
    return {
      matched: true,
      drugEntry: candidatesByGeneric[0],
      matchConfidence: "generic-prefix",
    };
  }

  // === PASS 4: Fuzzy substring match ===
  // Look for any brand name that contains the baseName or vice versa
  if (baseName && baseName.length >= 3) {
    for (const entry of database) {
      for (const brand of entry.commonBrands) {
        const brandNorm = normalize(brand);
        if (brandNorm.includes(baseName) || baseName.includes(normalize(brand.split(" ")[0]))) {
          // If we have a strength, verify it matches
          if (extractedStrength) {
            if (strengthMatches(extractedStrength, entry.strength)) {
              return {
                matched: true,
                drugEntry: entry,
                matchConfidence: "fuzzy",
              };
            }
          } else {
            return {
              matched: true,
              drugEntry: entry,
              matchConfidence: "fuzzy",
            };
          }
        }
      }
    }
  }

  return {
    matched: false,
    reason: "not in reference dataset, cannot verify",
  };
}
