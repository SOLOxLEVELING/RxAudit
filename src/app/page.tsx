"use client";

import { useState, useEffect, useCallback } from "react";
import { Pill, Activity, ShieldCheck, HelpCircle } from "lucide-react";
import BillUpload from "@/components/BillUpload";
import ExtractedBillEditor from "@/components/ExtractedBillEditor";
import AuditResults from "@/components/AuditResults";
import PharmacistCard from "@/components/PharmacistCard";
import { sampleBPBill } from "@/data/sample-bills";
import type { ExtractedBill, AuditReport, AuditLineResult, BillLineItem } from "@/data/schemas";

export default function Home() {
  const [bill, setBill] = useState<ExtractedBill>(sampleBPBill);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [activeSampleName, setActiveSampleName] = useState<string | null>(
    "Sample: Overcharged BP Bill"
  );
  const [pharmacistItem, setPharmacistItem] = useState<AuditLineResult | null>(null);

  // Execute deterministic audit API
  const executeAudit = useCallback(async (lineItems: BillLineItem[]) => {
    if (!lineItems || lineItems.length === 0) {
      setReport(null);
      return;
    }

    setIsAuditing(true);
    setAuditError(null);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineItems }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to audit bill items.");
      }

      setReport(data.report);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to run audit";
      setAuditError(msg);
    } finally {
      setIsAuditing(false);
    }
  }, []);

  // Run audit on mount with initial sample bill
  useEffect(() => {
    executeAudit(sampleBPBill.lineItems);
  }, [executeAudit]);

  const handleBillLoaded = (newBill: ExtractedBill, autoAudit = false) => {
    setBill(newBill);
    if (autoAudit) {
      executeAudit(newBill.lineItems);
    }
  };

  const handleManualAudit = () => {
    executeAudit(bill.lineItems);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Top Navigation / Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-700 flex items-center justify-center text-emerald-400">
              <Pill className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-zinc-100">RxAudit</h1>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-700 text-emerald-400">
                  DPCO 2013
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Chronic-Medication Price Auditor · NPPA Reference Engine
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-400 font-mono">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              151 Scheduled Drugs
            </span>
            <span className="text-zinc-700">|</span>
            <span className="text-zinc-400">Deterministic Arithmetic</span>
          </div>
        </div>
      </header>

      {/* Main Content Area: 2-Column Desktop Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column: Bill Input & Editable Items */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xs font-semibold tracking-wider uppercase text-zinc-400 mb-1">
                Step 1: Input Pharmacy Bill
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Choose a pre-verified test fixture or upload an Indian pharmacy receipt to extract line items with AI vision.
              </p>
            </div>

            <BillUpload
              onBillLoaded={handleBillLoaded}
              isExtracting={isExtracting}
              setIsExtracting={setIsExtracting}
              activeSampleName={activeSampleName}
              setActiveSampleName={setActiveSampleName}
            />

            <ExtractedBillEditor
              bill={bill}
              onChange={setBill}
              onAudit={handleManualAudit}
              isAuditing={isAuditing}
            />
          </div>

          {/* Right Column: Audit Results & Post-Audit Actions */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xs font-semibold tracking-wider uppercase text-zinc-400 mb-1">
                Step 2: Price Audit & Compliance Report
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Prices strictly evaluated against NPPA ceiling notifications. Overcharged items include counter cards and grievance drafts.
              </p>
            </div>

            {auditError && (
              <div className="p-3 bg-red-950/50 border border-red-900 rounded-lg text-xs text-red-300">
                {auditError}
              </div>
            )}

            {report ? (
              <AuditResults
                report={report}
                pharmacyName={bill.pharmacyName}
                billNumber={bill.billNumber}
                date={bill.date}
                onOpenPharmacistCard={(item) => setPharmacistItem(item)}
              />
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-10 text-center text-zinc-400 space-y-2">
                <Activity className="w-8 h-8 mx-auto text-zinc-400 animate-pulse" />
                <div className="text-xs font-medium text-zinc-300">
                  Ready to run price audit
                </div>
                <div className="text-[11px] text-zinc-400 max-w-sm mx-auto">
                  Select a sample bill on the left or upload an image to cross-reference every drug against NPPA ceiling prices.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pharmacist Discussion Card Modal */}
        {pharmacistItem && (
          <PharmacistCard
            item={pharmacistItem}
            pharmacyName={bill.pharmacyName}
            billNumber={bill.billNumber}
            date={bill.date}
            onClose={() => setPharmacistItem(null)}
          />
        )}

        {/* "How It Works" Section */}
        <section className="mt-12 pt-6 border-t border-zinc-800/80">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                How It Works — Deterministic Verification Architecture
              </h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              RxAudit uses AI vision to read your pharmacy bill, then checks every price against NPPA&apos;s published ceiling prices using deterministic code — not AI guesses. The AI extracts text; the math is exact.
            </p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-zinc-800/60 text-[11px] text-zinc-400">
              <div>
                <span className="font-semibold text-zinc-300 block">1. Vision Extraction</span>
                Amazon Bedrock Claude Haiku 4.5 extracts raw printed lines, quantities, and prices without estimating correctness.
              </div>
              <div>
                <span className="font-semibold text-zinc-300 block">2. Deterministic Match & Audit</span>
                Deterministic fuzzy matching maps brand names to 151 NPPA scheduled salts. Strict arithmetic flags overcharges.
              </div>
              <div>
                <span className="font-semibold text-zinc-300 block">3. Consumer Action</span>
                Generates instant pharmacist counter discussion cards and pre-formatted NPPA Pharma Sahi Daam grievances.
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-850 py-4 mt-8 bg-zinc-950 text-center text-xs text-zinc-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>RxAudit — Built for chronic care price transparency under DPCO 2013.</span>
          <span className="text-[11px] text-zinc-400">
            Ask your doctor or pharmacist about the generic equivalent.
          </span>
        </div>
      </footer>
    </div>
  );
}
