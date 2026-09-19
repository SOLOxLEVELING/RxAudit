"use client";

import { useState, useMemo } from "react";
import { Copy, Check, FileWarning, ExternalLink } from "lucide-react";
import { formatINR } from "@/lib/formatters";
import type { AuditLineResult } from "@/data/schemas";

interface GrievanceDraftProps {
  isOpen: boolean;
  onClose: () => void;
  pharmacyName?: string | null;
  billNumber?: string | null;
  date?: string | null;
  lineResults: AuditLineResult[];
  totalOvercharge: number;
}

export default function GrievanceDraft({
  isOpen,
  onClose,
  pharmacyName,
  billNumber,
  date,
  lineResults,
  totalOvercharge,
}: GrievanceDraftProps) {
  const [copied, setCopied] = useState(false);

  const flaggedItems = useMemo(
    () => lineResults.filter((item) => item.isOvercharged),
    [lineResults]
  );

  const grievanceText = useMemo(() => {
    const pName = pharmacyName || "[Pharmacy Name / Location]";
    const bNum = billNumber || "[Bill Number]";
    const bDate = date || "[Bill Date]";

    const itemsText = flaggedItems
      .map((item) => {
        const billed = formatINR(item.billedUnitPrice);
        const ceiling = formatINR(item.ceilingPricePerUnit);
        const overcharge = formatINR(item.overchargeForLine);
        return `- ${item.drugName}: Billed ${billed}, DPCO 2013 ceiling price ${ceiling}, overcharge ${overcharge} (Qty: ${item.quantity})`;
      })
      .join("\n");

    const citations = Array.from(
      new Set(
        flaggedItems
          .map((item) => item.regulatoryBasis || "DPCO 2013 ceiling price")
          .filter(Boolean)
      )
    ).join("; ");

    return `To: National Pharmaceutical Pricing Authority (NPPA)
Via: Pharma Sahi Daam Portal

Pharmacy: ${pName}
Bill No: ${bNum}
Date: ${bDate}

I wish to report overcharging on the following medications:

${itemsText}

Total overcharge: ${formatINR(totalOvercharge)}

Regulatory basis: ${citations || "DPCO 2013 ceiling price"}`;
  }, [pharmacyName, billNumber, date, flaggedItems, totalOvercharge]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(grievanceText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  if (!isOpen || flaggedItems.length === 0) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="grievance-draft-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-lg p-5 shadow-2xl text-zinc-100 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <FileWarning className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h2 id="grievance-draft-title" className="text-sm font-semibold tracking-wide uppercase text-zinc-200">
                NPPA Pharma Sahi Daam Grievance Draft
              </h2>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Pre-formatted complaint text ready for submission via NPPA&apos;s portal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-100 transition-colors rounded hover:bg-zinc-800 cursor-pointer"
            aria-label="Close dialog"
          >
            <span className="sr-only">Close</span>
            ✕
          </button>
        </div>

        {/* Metadata summary */}
        <div className="mt-3 text-xs text-zinc-400 flex flex-wrap items-center gap-x-4 gap-y-1 bg-zinc-950 p-2.5 rounded border border-zinc-800 shrink-0">
          <div>
            <span className="text-zinc-500">Store: </span>
            <span className="text-zinc-200 font-medium">{pharmacyName || "Unknown"}</span>
          </div>
          {billNumber && (
            <div>
              <span className="text-zinc-500">Bill #: </span>
              <span className="text-zinc-200 font-mono">{billNumber}</span>
            </div>
          )}
          <div>
            <span className="text-zinc-500">Flagged: </span>
            <span className="text-red-400 font-mono font-medium">{flaggedItems.length} items</span>
          </div>
          <div>
            <span className="text-zinc-500">Total Claim: </span>
            <span className="text-red-400 font-mono font-semibold">+{formatINR(totalOvercharge)}</span>
          </div>
        </div>

        {/* Grievance Text Body */}
        <div className="mt-3 flex-1 overflow-y-auto">
          <pre className="p-3.5 bg-zinc-950 border border-zinc-800 rounded font-mono text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed selection:bg-zinc-800">
            {grievanceText}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-3 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <a
            href="https://nppaindia.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1.5 transition-colors"
          >
            NPPA Pharma Sahi Daam Portal <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleCopy}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied to Clipboard!" : "Copy Complaint Draft"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
