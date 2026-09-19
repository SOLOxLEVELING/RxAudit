"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Pill,
  Activity,
  ShieldCheck,
  FileText,
  Pencil,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import BillUpload from "@/components/BillUpload";
import ExtractedBillEditor from "@/components/ExtractedBillEditor";
import AuditResults from "@/components/AuditResults";
import PharmacistCard from "@/components/PharmacistCard";
import { sampleBPBill } from "@/data/sample-bills";
import { formatINR } from "@/lib/formatters";
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
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const totalBillAmount = useMemo(() => {
    return bill.lineItems.reduce((sum, item) => {
      const lineTotal =
        typeof item.lineTotal === "number" && !isNaN(item.lineTotal)
          ? item.lineTotal
          : (item.quantity || 0) * (item.unitPrice || 0);
      return sum + lineTotal;
    }, 0);
  }, [bill.lineItems]);

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

      const contentType = res.headers.get("content-type") || "";
      let data: { success?: boolean; report?: AuditReport; error?: string } | null = null;

      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        throw new Error(
          `Server returned an unexpected response (${res.status}). Please verify the local dev server is running on port 3000.`
        );
      }

      if (!res.ok || !data?.success || !data?.report) {
        throw new Error(data?.error || "Failed to audit bill items.");
      }

      setReport(data.report);
      setIsEditing(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to run audit";
      setAuditError(msg);
    } finally {
      setIsAuditing(false);
    }
  }, []);

  useEffect(() => {
    executeAudit(sampleBPBill.lineItems);
  }, [executeAudit]);

  const handleBillLoaded = (newBill: ExtractedBill, autoAudit = false) => {
    setBill(newBill);
    if (autoAudit) {
      executeAudit(newBill.lineItems);
    } else {
      setIsEditing(true);
      setToast(`Extracted ${newBill.lineItems.length} item${newBill.lineItems.length !== 1 ? "s" : ""} — review below and hit Audit`);
    }
  };

  const handleManualAudit = () => {
    executeAudit(bill.lineItems);
  };

  const showResults = !!report && !isEditing;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="border-b border-zinc-800/60 bg-zinc-900/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 sm:px-12 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-emerald-400">
              <Pill className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-zinc-100">RxAudit</h1>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-emerald-400">
                  DPCO 2013
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                Chronic-Medication Price Auditor
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-500 font-mono">
            <span className="inline-flex items-center gap-1 text-emerald-400/80">
              <ShieldCheck className="w-3.5 h-3.5" />
              153 Drugs
            </span>
            <span className="text-zinc-800">|</span>
            <span>Deterministic</span>
          </div>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────────── */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 sm:px-10 py-10">
        {showResults ? (
          /* ═══════════ RESULTS VIEW ═══════════ */
          <div className="space-y-10">
            {/* Bill info bar — replaces the old collapsible */}
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <FileText className="w-4 h-4 text-zinc-600 shrink-0" />
                <span className="font-medium text-zinc-200">
                  {bill.pharmacyName || "Pharmacy Receipt"}
                </span>
                {bill.billNumber && (
                  <>
                    <span className="text-zinc-700">·</span>
                    <span className="font-mono text-zinc-500">{bill.billNumber}</span>
                  </>
                )}
                <span className="text-zinc-700">·</span>
                <span className="font-mono text-zinc-500">
                  {bill.lineItems.length} item{bill.lineItems.length !== 1 ? "s" : ""}
                </span>
                <span className="text-zinc-700">·</span>
                <span className="font-mono font-medium text-emerald-400">
                  {formatINR(totalBillAmount)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-600 bg-zinc-900 transition-colors cursor-pointer ml-4"
              >
                <Pencil className="w-3 h-3" />
                Edit Bill
              </button>
            </div>

            {/* Audit report */}
            <AuditResults
              report={report}
              pharmacyName={bill.pharmacyName}
              billNumber={bill.billNumber}
              date={bill.date}
              onOpenPharmacistCard={(item) => setPharmacistItem(item)}
            />
          </div>
        ) : (
          /* ═══════════ INPUT VIEW ═══════════ */
          <div className="space-y-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-zinc-100">
                  Input Pharmacy Bill
                </h2>
                <p className="text-sm text-zinc-400 mt-2">
                  Select a demo bill, upload an image or PDF, or edit items manually.
                </p>
              </div>
              {report && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-600 bg-zinc-900 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back to Results
                </button>
              )}
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
        )}

        {/* Auditing state */}
        {isAuditing && (
          <div className="mt-10 flex items-center justify-center gap-2 text-sm text-emerald-400">
            <Activity className="w-4 h-4 animate-spin" />
            <span className="font-medium">Running price audit...</span>
          </div>
        )}

        {auditError && (
          <div className="mt-10 p-4 bg-red-950/40 border border-red-900/50 rounded-xl text-sm text-red-300">
            {auditError}
          </div>
        )}

        {!report && !isEditing && !isAuditing && (
          <div className="mt-10 bg-zinc-900 border border-zinc-800 rounded-xl p-14 text-center space-y-3">
            <Activity className="w-8 h-8 mx-auto text-zinc-600 animate-pulse" />
            <div className="text-sm font-medium text-zinc-300">
              Ready to run price audit
            </div>
            <div className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
              Select a sample bill or upload a pharmacy receipt to check prices against NPPA statutory caps.
            </div>
          </div>
        )}

        {/* Pharmacist Card Modal */}
        {pharmacistItem && (
          <PharmacistCard
            item={pharmacistItem}
            pharmacyName={bill.pharmacyName}
            billNumber={bill.billNumber}
            date={bill.date}
            onClose={() => setPharmacistItem(null)}
          />
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-800/60 py-5 mt-auto text-center text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto px-6 sm:px-12 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>RxAudit — Built for chronic care price transparency under DPCO 2013.</span>
          <span className="text-[11px] text-zinc-500">
            Ask your doctor or pharmacist about the generic equivalent.
          </span>
        </div>
      </footer>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 shadow-lg text-sm text-zinc-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
