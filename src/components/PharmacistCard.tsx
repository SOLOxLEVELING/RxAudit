"use client";

import { useState } from "react";
import { Copy, Check, Share2, X, AlertTriangle, ShieldCheck } from "lucide-react";
import { formatINR } from "@/lib/formatters";
import type { AuditLineResult } from "@/data/schemas";

interface PharmacistCardProps {
  item: AuditLineResult;
  pharmacyName?: string | null;
  billNumber?: string | null;
  date?: string | null;
  onClose: () => void;
}

export default function PharmacistCard({
  item,
  pharmacyName,
  billNumber,
  date,
  onClose,
}: PharmacistCardProps) {
  const [copied, setCopied] = useState(false);

  const ceilingFormatted = formatINR(item.ceilingPricePerUnit);
  const billedFormatted = formatINR(item.billedUnitPrice);
  const overchargeFormatted = formatINR(item.overchargeForLine);

  const cardText = `Pharmacist Discussion Summary:
Drug: ${item.drugName}
Under DPCO 2013, the maximum retail price for ${item.drugName} is ${ceilingFormatted}. You were charged ${billedFormatted}.
Overcharge for this bill: ${overchargeFormatted} (Qty: ${item.quantity})
${item.genericAlternative ? `Generic equivalent: ${item.genericAlternative} (${formatINR(item.genericPrice)})` : ""}
Regulatory Basis: ${item.regulatoryBasis || "DPCO 2013 ceiling price"}

Ask your doctor or pharmacist about the generic equivalent.`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cardText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `DPCO Ceiling Price Query - ${item.drugName}`,
          text: cardText,
        });
      } catch {
        // user cancelled or share failed
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pharmacist-card-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-lg p-5 shadow-2xl text-zinc-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 id="pharmacist-card-title" className="text-sm font-semibold tracking-wide uppercase text-zinc-200">
              Pharmacist Discussion Card
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-100 transition-colors rounded hover:bg-zinc-800"
            aria-label="Close card"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bill Metadata if present */}
        {(pharmacyName || billNumber || date) && (
          <div className="mt-3 text-xs text-zinc-400 flex flex-wrap gap-x-3 gap-y-1 bg-zinc-950/60 p-2 rounded border border-zinc-800/80">
            {pharmacyName && <span><span className="text-zinc-400">Store:</span> {pharmacyName}</span>}
            {billNumber && <span><span className="text-zinc-400">Bill #:</span> {billNumber}</span>}
            {date && <span><span className="text-zinc-400">Date:</span> {date}</span>}
          </div>
        )}

        {/* Drug Name & Flag Badge */}
        <div className="mt-4 p-3 bg-zinc-950 rounded border border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-zinc-400">Flagged Item</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-800">
              <AlertTriangle className="w-3 h-3" />
              Above DPCO Ceiling
            </span>
          </div>
          <p className="text-lg font-bold text-zinc-100 mt-1">{item.drugName}</p>
          {item.matchedGenericName && (
            <p className="text-xs text-zinc-400">INN: {item.matchedGenericName}</p>
          )}
        </div>

        {/* Price Comparison Grid */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
            <div className="text-[11px] text-zinc-400">Billed Unit</div>
            <div className="text-sm font-mono font-semibold text-zinc-200 mt-0.5">
              {billedFormatted}
            </div>
          </div>
          <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
            <div className="text-[11px] text-zinc-400">DPCO Ceiling</div>
            <div className="text-sm font-mono font-semibold text-emerald-400 mt-0.5">
              {ceilingFormatted}
            </div>
          </div>
          <div className="bg-red-950/40 p-2.5 rounded border border-red-900/60">
            <div className="text-[11px] text-red-300">Overcharge</div>
            <div className="text-sm font-mono font-semibold text-red-400 mt-0.5">
              +{overchargeFormatted}
            </div>
          </div>
        </div>

        {/* Statutory Statement */}
        <div className="mt-3 p-3 bg-zinc-950 rounded border border-zinc-800 text-xs text-zinc-300 leading-relaxed">
          <p>
            Under DPCO 2013, the maximum retail price for{" "}
            <span className="font-semibold text-zinc-100">{item.drugName}</span> is{" "}
            <span className="font-mono text-emerald-400 font-semibold">{ceilingFormatted}</span> per unit. You were charged{" "}
            <span className="font-mono text-red-400 font-semibold">{billedFormatted}</span>.
          </p>
        </div>

        {/* Generic Alternative */}
        {item.genericAlternative && (
          <div className="mt-3 p-3 bg-zinc-950 rounded border border-zinc-800">
            <div className="text-xs text-zinc-400">Generic Alternative Equivalent</div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-sm font-semibold text-zinc-200">
                {item.genericAlternative}
              </span>
              {item.genericPrice !== null && (
                <span className="text-xs font-mono text-emerald-400">
                  {formatINR(item.genericPrice)} / pack
                </span>
              )}
            </div>
          </div>
        )}

        {/* Mandatory Medical Disclaimer */}
        <div className="mt-3 p-2.5 bg-amber-950/30 border border-amber-800/40 rounded text-[11px] text-amber-200 font-medium">
          Ask your doctor or pharmacist about the generic equivalent.
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-600 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied to Clipboard" : "Copy for Counter"}
          </button>
          <button
            onClick={handleShare}
            className="inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 transition-colors"
            title="Share"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
