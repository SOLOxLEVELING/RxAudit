import type { ExtractedBill } from "./schemas";

/**
 * Sample Bill 1: Overcharged BP Bill
 * 4 line items of common BP drugs, at least 2 priced above ceiling.
 * Total bill ~₹1,050
 */
export const sampleBPBill: ExtractedBill = {
  pharmacyName: "MedPlus Pharmacy - Koramangala",
  billNumber: "MP-2026-08734",
  date: "2026-09-15",
  lineItems: [
    {
      drugName: "TELMI 40",
      quantity: 30,
      unitPrice: 7.22,
      lineTotal: 216.60,
    },
    {
      drugName: "AMLODAC 5",
      quantity: 30,
      unitPrice: 5.80,
      lineTotal: 174.00,
    },
    {
      drugName: "ECOSPRIN 75",
      quantity: 28,
      unitPrice: 0.36,
      lineTotal: 10.08,
    },
    {
      drugName: "ATORVA 10",
      quantity: 30,
      unitPrice: 7.50,
      lineTotal: 225.00,
    },
    {
      drugName: "CARDACE 5",
      quantity: 15,
      unitPrice: 12.50,
      lineTotal: 187.50,
    },
  ],
};

/**
 * Sample Bill 2: Diabetes Multi-Strip Bill
 * 5 line items including Metformin, Glimepiride combo, Atorvastatin.
 * At least 2 overcharged. Total bill ~₹1,800
 */
export const sampleDiabetesBill: ExtractedBill = {
  pharmacyName: "Apollo Pharmacy - Jayanagar",
  billNumber: "AP-2026-45218",
  date: "2026-09-10",
  lineItems: [
    {
      drugName: "GLYCOMET GP 2",
      quantity: 30,
      unitPrice: 14.50,
      lineTotal: 435.00,
    },
    {
      drugName: "GLYCOMET SR 1000",
      quantity: 30,
      unitPrice: 8.20,
      lineTotal: 246.00,
    },
    {
      drugName: "JANUVIA 100",
      quantity: 10,
      unitPrice: 56.00,
      lineTotal: 560.00,
    },
    {
      drugName: "ATORVA 20",
      quantity: 15,
      unitPrice: 18.00,
      lineTotal: 270.00,
    },
    {
      drugName: "ECOSPRIN 75",
      quantity: 28,
      unitPrice: 0.36,
      lineTotal: 10.08,
    },
  ],
};

/**
 * Sample Bill 3: Clean Bill (No Issues)
 * 4 line items all priced at or below ceiling.
 * Total bill ~₹350
 */
export const sampleCleanBill: ExtractedBill = {
  pharmacyName: "Netmeds Pharmacy - HSR Layout",
  billNumber: "NM-2026-12092",
  date: "2026-09-12",
  lineItems: [
    {
      drugName: "AMLONG 5",
      quantity: 10,
      unitPrice: 2.40,
      lineTotal: 24.00,
    },
    {
      drugName: "ATEN 50",
      quantity: 14,
      unitPrice: 3.50,
      lineTotal: 49.00,
    },
    {
      drugName: "GLYCOMET 500",
      quantity: 10,
      unitPrice: 2.00,
      lineTotal: 20.00,
    },
    {
      drugName: "ECOSPRIN 75",
      quantity: 14,
      unitPrice: 0.35,
      lineTotal: 4.90,
    },
  ],
};

export const sampleBills = [
  { name: "Sample: Overcharged BP Bill", bill: sampleBPBill },
  { name: "Sample: Diabetes Multi-Strip Bill", bill: sampleDiabetesBill },
  { name: "Sample: Clean Bill (No Issues)", bill: sampleCleanBill },
];
