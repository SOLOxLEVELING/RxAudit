import { z } from "zod";

// ──────────────────────────────────────────────
// Drug Database Entry Schema
// ──────────────────────────────────────────────

export const DrugEntrySchema = z.object({
  id: z.string(), // kebab-case unique key
  genericName: z.string(), // INN/salt name
  strength: z.string(), // e.g. "5 mg"
  form: z.string(), // e.g. "Tablet"
  packSize: z.number().int().positive(),
  packUnit: z.string(), // e.g. "tablets"
  ceilingPricePerUnit: z.number().nonnegative(), // NPPA ceiling price per single unit (₹)
  ceilingPricePerPack: z.number().nonnegative(), // = ceilingPricePerUnit * packSize
  commonBrands: z.array(z.string()),
  typicalBrandedPricePerPack: z.number().nonnegative(),
  category: z.enum([
    "antihypertensive",
    "antidiabetic",
    "statin",
    "other",
  ]),
  regulatoryBasis: z.string(), // e.g. "DPCO 2013 ceiling price"
  janAushadhiPrice: z.number().nonnegative().nullable(),
});

export type DrugEntry = z.infer<typeof DrugEntrySchema>;

// ──────────────────────────────────────────────
// Bill Line Item (as extracted from a bill)
// ──────────────────────────────────────────────

export const BillLineItemSchema = z.object({
  drugName: z.string(), // as printed on bill (brand name, possibly abbreviated)
  quantity: z.number().nonnegative(),
  unitPrice: z.number().nonnegative(), // per unit billed
  lineTotal: z.number().nonnegative(),
});

export type BillLineItem = z.infer<typeof BillLineItemSchema>;

// ──────────────────────────────────────────────
// Extracted Bill (from vision extraction or manual entry)
// ──────────────────────────────────────────────

export const ExtractedBillSchema = z.object({
  pharmacyName: z.string(),
  billNumber: z.string().nullable(),
  date: z.string().nullable(), // YYYY-MM-DD or null
  lineItems: z.array(BillLineItemSchema),
});

export type ExtractedBill = z.infer<typeof ExtractedBillSchema>;

// ──────────────────────────────────────────────
// Audit Results
// ──────────────────────────────────────────────

export const AuditLineResultSchema = z.object({
  drugName: z.string(), // as printed on bill
  quantity: z.number(),
  billedUnitPrice: z.number(),
  billedLineTotal: z.number(),
  matched: z.boolean(),
  matchedDrugId: z.string().nullable(),
  matchedGenericName: z.string().nullable(),
  ceilingPricePerUnit: z.number().nullable(),
  ceilingPriceForQty: z.number().nullable(),
  overchargePerUnit: z.number().nullable(),
  overchargeForLine: z.number().nullable(),
  isOvercharged: z.boolean(),
  genericAlternative: z.string().nullable(),
  genericPrice: z.number().nullable(), // price of the generic per pack
  janAushadhiPrice: z.number().nullable(),
  potentialSaving: z.number().nullable(),
  regulatoryBasis: z.string().nullable(),
  verdict: z.enum(["OVERCHARGED", "FAIR", "UNVERIFIED"]),
});

export type AuditLineResult = z.infer<typeof AuditLineResultSchema>;

export const AuditReportSchema = z.object({
  verdict: z.enum(["OVERCHARGED", "CLEAR", "PARTIAL"]),
  totalBilled: z.number(),
  totalCeilingValue: z.number(),
  totalOvercharge: z.number(),
  estimatedAnnualOvercharge: z.number(), // totalOvercharge * 12
  lineResults: z.array(AuditLineResultSchema),
});

export type AuditReport = z.infer<typeof AuditReportSchema>;
