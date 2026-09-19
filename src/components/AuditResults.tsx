"use client";

import React, { useState, useMemo } from "react";
import {
  CheckCircle2,
  ChevronDown,
  MessageSquare,
  FileWarning,
  Info,
} from "lucide-react";
import { formatINR } from "@/lib/formatters";
import type { AuditReport, AuditLineResult } from "@/data/schemas";
import GrievanceDraft from "./GrievanceDraft";

interface AuditResultsProps {
  report: AuditReport;
  pharmacyName?: string | null;
  billNumber?: string | null;
  date?: string | null;
  onOpenPharmacistCard: (item: AuditLineResult) => void;
}

export default function AuditResults({
  report,
  pharmacyName,
  billNumber,
  date,
  onOpenPharmacistCard,
}: AuditResultsProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [isGrievanceOpen, setIsGrievanceOpen] = useState(false);

  const isOvercharged = report.verdict === "OVERCHARGED";
  const isClear = report.verdict === "CLEAR";
  const isPartial = report.verdict === "PARTIAL";

  // Sort: OVERCHARGED (by overcharge desc) → FAIR → UNVERIFIED
  const sortedItems = useMemo(() => {
    const verdictPriority: Record<string, number> = {
      OVERCHARGED: 0,
      FAIR: 1,
      UNVERIFIED: 2,
    };
    return [...report.lineResults].sort((a, b) => {
      const pA = verdictPriority[a.verdict] ?? 3;
      const pB = verdictPriority[b.verdict] ?? 3;
      if (pA !== pB) return pA - pB;
      return (b.overchargeForLine ?? 0) - (a.overchargeForLine ?? 0);
    });
  }, [report.lineResults]);

  const overchargedCount = useMemo(
    () => report.lineResults.filter((i) => i.verdict === "OVERCHARGED").length,
    [report.lineResults]
  );

  const verifiedCount = useMemo(
    () => report.lineResults.filter((i) => i.verdict !== "UNVERIFIED").length,
    [report.lineResults]
  );

  const annualCost =
    report.estimatedAnnualOvercharge || report.totalOvercharge * 12;

  const toggleRow = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="space-y-10">
      {/* ── Section Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-100">
            Price Audit Report
          </h2>
          <p className="text-sm text-zinc-400 mt-2">
            Prices verified against NPPA statutory ceiling prices under DPCO
            2013.
          </p>
        </div>
        {(isOvercharged || isPartial) && report.totalOvercharge > 0 && (
          <button
            type="button"
            onClick={() => setIsGrievanceOpen(true)}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-zinc-700 rounded-lg text-zinc-300 hover:text-zinc-100 hover:border-zinc-600 bg-zinc-900 hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Generate NPPA Pharma Sahi Daam complaint draft"
          >
            <FileWarning className="w-4 h-4 text-amber-400" />
            Grievance Draft
          </button>
        )}
      </div>

      {/* ── Verdict Summary Card (2-column layout) ─────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-8">
          {/* Left column: verdict + big number (60%) */}
          <div className="flex-1 min-w-0">
            {isClear ? (
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  CLEAR
                </span>
                <div className="text-2xl font-semibold font-mono text-zinc-100 pt-1">
                  ₹0.00
                </div>
                <p className="text-sm text-zinc-400">
                  All verified prices are within legal limits
                </p>
                <p className="text-sm text-zinc-500">
                  {verifiedCount} of {report.lineResults.length} items verified
                  against NPPA database
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    isOvercharged
                      ? "bg-red-500/10 text-red-400 border-red-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                  {report.verdict}
                </span>
                <div className="text-2xl font-semibold font-mono pt-1 text-zinc-100">
                  +{formatINR(report.totalOvercharge)}
                </div>
                <p className="text-sm text-zinc-400">
                  overcharged across {overchargedCount} medication
                  {overchargedCount !== 1 ? "s" : ""}
                </p>
                <p className="text-sm text-zinc-500">
                  {verifiedCount} of {report.lineResults.length} items verified
                  against NPPA database
                </p>
                {annualCost > 0 && (
                  <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <span className="font-mono font-semibold text-sm text-amber-300">
                      {formatINR(annualCost)}
                    </span>
                    <span className="text-xs text-amber-400/80">
                      / year assuming monthly refills
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dividers */}
          <div className="hidden sm:block w-px bg-zinc-800 shrink-0" />
          <div className="sm:hidden h-px bg-zinc-800" />

          {/* Right column: metric boxes (~40%) */}
          <div className="sm:w-56 shrink-0 space-y-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-5">
              <div className="text-xs text-zinc-500 font-medium">
                Total Billed
              </div>
              <div className="text-lg font-mono font-semibold text-zinc-100 mt-1.5">
                {formatINR(report.totalBilled)}
              </div>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-5">
              <div className="text-xs text-zinc-500 font-medium">
                Govt Ceiling
              </div>
              <div className="text-lg font-mono font-semibold text-emerald-400 mt-1.5">
                {formatINR(report.totalCeilingValue)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Medications Table ───────────────────────────────────────── */}
      <div>
        {/* Table section header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-zinc-100">Medications</h3>
          <span className="text-sm text-zinc-500">
            {sortedItems.length} item{sortedItems.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table container */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/50">
                <th className="px-6 py-3.5 text-xs text-zinc-500 font-medium">
                  Medicine
                </th>
                <th className="px-4 py-3.5 text-xs text-zinc-500 font-medium text-right hidden sm:table-cell">
                  Qty
                </th>
                <th className="px-4 py-3.5 text-xs text-zinc-500 font-medium text-right hidden md:table-cell">
                  Billed
                </th>
                <th className="px-4 py-3.5 text-xs text-zinc-500 font-medium text-right hidden md:table-cell">
                  Ceiling
                </th>
                <th className="px-4 py-3.5 text-xs text-zinc-500 font-medium text-center">
                  Status
                </th>
                <th className="px-4 py-3.5 text-xs text-zinc-500 font-medium text-right hidden sm:table-cell">
                  Overcharge
                </th>
                <th className="px-5 py-3.5 w-12" />
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item, idx) => {
                const rowKey = `${item.drugName}-${idx}`;
                const isExpanded = expandedKeys.has(rowKey);
                const isItemOvercharged = item.verdict === "OVERCHARGED";
                const isItemFair = item.verdict === "FAIR";
                const isItemUnverified = item.verdict === "UNVERIFIED";

                return (
                  <React.Fragment key={rowKey}>
                    {/* Main data row */}
                    <tr className="border-b border-zinc-800/60 hover:bg-zinc-800/20 transition-colors">
                      {/* Medicine name + salt */}
                      <td className="px-6 py-5">
                        <div className="text-sm font-medium text-zinc-100">
                          {item.drugName}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {item.matchedGenericName ?? "Not in NPPA list"}
                        </div>
                      </td>

                      {/* Qty */}
                      <td className="px-4 py-5 text-right hidden sm:table-cell">
                        <span className="font-mono text-sm text-zinc-300">
                          {item.quantity}
                        </span>
                      </td>

                      {/* Billed/unit */}
                      <td className="px-4 py-5 text-right hidden md:table-cell">
                        <span className="font-mono text-sm text-zinc-300">
                          {formatINR(item.billedUnitPrice)}
                        </span>
                      </td>

                      {/* Ceiling/unit */}
                      <td className="px-4 py-5 text-right hidden md:table-cell">
                        {item.ceilingPricePerUnit !== null ? (
                          <span className="font-mono text-sm text-emerald-400">
                            {formatINR(item.ceilingPricePerUnit)}
                          </span>
                        ) : (
                          <span className="text-zinc-600 text-sm">—</span>
                        )}
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-5 text-center">
                        {isItemOvercharged && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                            Overcharged
                          </span>
                        )}
                        {isItemFair && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            Fair
                          </span>
                        )}
                        {isItemUnverified && (
                          <span className="relative group inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-default">
                            <Info className="w-3 h-3 shrink-0" />
                            Unverified
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-[11px] text-zinc-200 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">
                              No DPCO 2013 ceiling price exists for this medicine
                            </span>
                          </span>
                        )}
                      </td>

                      {/* Overcharge amount */}
                      <td className="px-4 py-5 text-right hidden sm:table-cell">
                        {isItemOvercharged && (
                          <span className="font-mono text-sm font-medium text-zinc-300">
                            +{formatINR(item.overchargeForLine ?? 0)}
                          </span>
                        )}
                        {(isItemFair || isItemUnverified) && (
                          <span className="text-sm text-zinc-700">—</span>
                        )}
                      </td>

                      {/* Details toggle */}
                      <td className="px-5 py-5 text-right">
                        {!isItemUnverified && (
                          <button
                            type="button"
                            onClick={() => toggleRow(rowKey)}
                            className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-150 ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded details panel */}
                    {isExpanded && (
                      <tr className="border-b border-zinc-800/50">
                        <td colSpan={7} className="bg-zinc-950 px-6 py-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Statutory breakdown */}
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                                <Info className="w-3.5 h-3.5" />
                                Statutory Pricing Breakdown
                              </div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                                <div>
                                  <div className="text-zinc-500 mb-0.5">
                                    Billed Unit Price
                                  </div>
                                  <div className="font-mono font-medium text-zinc-200">
                                    {formatINR(item.billedUnitPrice)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-zinc-500 mb-0.5">
                                    DPCO Ceiling / Unit
                                  </div>
                                  <div className="font-mono font-medium text-emerald-400">
                                    {item.ceilingPricePerUnit !== null
                                      ? formatINR(item.ceilingPricePerUnit)
                                      : "Not Scheduled"}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-zinc-500 mb-0.5">
                                    Billed Line Total
                                  </div>
                                  <div className="font-mono font-medium text-zinc-200">
                                    {formatINR(item.billedLineTotal)}{" "}
                                    <span className="text-zinc-400 font-sans">
                                      (Qty {item.quantity})
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <div className="text-zinc-500 mb-0.5">
                                    Statutory Maximum Cap
                                  </div>
                                  <div className="font-mono font-medium text-emerald-400">
                                    {item.ceilingPriceForQty !== null
                                      ? formatINR(item.ceilingPriceForQty)
                                      : "N/A"}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 pt-3 border-t border-zinc-800 text-xs text-zinc-500">
                                Regulatory Basis:{" "}
                                <span className="text-zinc-400">
                                  {item.regulatoryBasis ||
                                    "DPCO 2013 ceiling price (NPPA Gazette)"}
                                </span>
                              </div>
                            </div>

                            {/* Generic alternative + Counter Card button */}
                            <div className="space-y-3">
                              {item.genericAlternative ? (
                                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                                    Generic Alternative
                                  </div>
                                  <div className="flex items-baseline justify-between gap-2">
                                    <span className="text-sm font-medium text-zinc-200">
                                      {item.genericAlternative}
                                    </span>
                                    {item.genericPrice !== null && (
                                      <span className="font-mono text-sm text-emerald-400 shrink-0">
                                        {formatINR(item.genericPrice)} / pack
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-zinc-500 italic mt-2">
                                    Ask your doctor or pharmacist about the
                                    generic equivalent.
                                  </p>
                                </div>
                              ) : (
                                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-xs text-zinc-500">
                                  No Jan Aushadhi generic equivalent in
                                  reference database.
                                </div>
                              )}

                              {isItemOvercharged && (
                                <button
                                  type="button"
                                  onClick={() => onOpenPharmacistCard(item)}
                                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-emerald-500/30 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                  Open Counter Card
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* GrievanceDraft Modal */}
      <GrievanceDraft
        isOpen={isGrievanceOpen}
        onClose={() => setIsGrievanceOpen(false)}
        pharmacyName={pharmacyName}
        billNumber={billNumber}
        date={date}
        lineResults={report.lineResults}
        totalOvercharge={report.totalOvercharge}
      />
    </div>
  );
}
