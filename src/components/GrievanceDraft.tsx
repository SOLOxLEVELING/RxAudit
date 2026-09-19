"use client";

import { useState, useMemo } from "react";
import { Copy, Check, FileWarning, ExternalLink } from "lucide-react";
import { formatINR } from "@/lib/formatters";
import type { AuditLineResult } from "@/data/schemas";

interface GrievanceDraftProps {
  pharmacyName?: string | null;
  billNumber?: string | null;
  date?: string | null;
  lineResults: AuditLineResult[];
  totalOvercharge: number;
}

export default function GrievanceDraft({
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

  if (flaggedItems.length === 0) {
    return null;
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-zinc-100">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <FileWarning className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-semibold tracking-wider uppercase text-zinc-300">
            NPPA Pharma Sahi Daam Grievance Draft
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://nppaindia.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1 transition-colors"
          >
            Portal <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy Draft"}
          </button>
        </div>
      </div>

      <p className="mt-2.5 text-xs text-zinc-400 leading-relaxed">
        Pre-formatted complaint text ready for submission via NPPA&apos;s{" "}
        <span className="text-zinc-300 font-medium">Pharma Sahi Daam</span> portal.
      </p>

      <div className="mt-3 relative">
        <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded font-mono text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed overflow-x-auto selection:bg-zinc-800">
          {grievanceText}
        </pre>
      </div>
    </div>
  );
}
