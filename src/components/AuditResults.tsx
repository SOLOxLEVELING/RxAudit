"use client";

import { AlertTriangle, CheckCircle2, HelpCircle, ShieldAlert, MessageSquare } from "lucide-react";
import { formatINR } from "@/lib/formatters";
import type { AuditReport, AuditLineResult } from "@/data/schemas";
import AnnualImpact from "./AnnualImpact";
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
  const isOvercharged = report.verdict === "OVERCHARGED";
  const isClear = report.verdict === "CLEAR";
  const isPartial = report.verdict === "PARTIAL";

  return (
    <div className="space-y-4">
      {/* Verdict Banner */}
      <div
        className={`rounded-lg border p-4 transition-all ${
          isOvercharged
            ? "bg-red-950/40 border-red-800/80 text-red-200"
            : isClear
            ? "bg-emerald-950/40 border-emerald-800/80 text-emerald-200"
            : "bg-amber-950/40 border-amber-800/80 text-amber-200"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {isOvercharged && <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />}
            {isClear && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            {isPartial && <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider">
                Audit Verdict
              </div>
              <div className="text-base font-bold tracking-tight">
                {isOvercharged && "Overcharges Flagged Above DPCO 2013 Ceiling"}
                {isClear && "Clean Bill — All Verified Drugs Within DPCO Ceiling"}
                {isPartial && "Partial Match — Overcharges Detected on Verified Items"}
              </div>
            </div>
          </div>
          <span
            className={`text-xs font-mono font-bold px-2.5 py-1 rounded border uppercase tracking-wider ${
              isOvercharged
                ? "bg-red-900/60 text-red-300 border-red-700"
                : isClear
                ? "bg-emerald-900/60 text-emerald-300 border-emerald-700"
                : "bg-amber-900/60 text-amber-300 border-amber-700"
            }`}
          >
            {report.verdict}
          </span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3.5">
          <div className="text-[11px] text-zinc-400 uppercase tracking-wider">Total Billed</div>
          <div className="text-xl font-mono font-bold text-zinc-100 mt-1">
            {formatINR(report.totalBilled)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">As charged on invoice</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3.5">
          <div className="text-[11px] text-zinc-400 uppercase tracking-wider">Govt Ceiling Value</div>
          <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
            {formatINR(report.totalCeilingValue)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Per NPPA statutory cap</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3.5">
          <div className="text-[11px] text-zinc-400 uppercase tracking-wider">Total Overcharge</div>
          <div
            className={`text-xl font-mono font-bold mt-1 ${
              report.totalOvercharge > 0 ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {report.totalOvercharge > 0 ? `+${formatINR(report.totalOvercharge)}` : "₹0.00"}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            {report.totalOvercharge > 0 ? "Exceeds maximum retail cap" : "Zero illegal overcharges"}
          </div>
        </div>
      </div>

      {/* Annual Impact Component */}
      {report.totalOvercharge > 0 && (
        <AnnualImpact totalOvercharge={report.totalOvercharge} />
      )}

      {/* Line-by-Line Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-zinc-100">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div>
            <h3 className="text-xs font-semibold tracking-wider uppercase text-zinc-300">
              Line-By-Line Price Verification
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Verified against 151 NPPA scheduled chronic medications.
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-400">
            {report.lineResults.length} items evaluated
          </span>
        </div>

        <div className="mt-3 space-y-3">
          {report.lineResults.map((item, idx) => {
            const isItemOvercharged = item.verdict === "OVERCHARGED";
            const isItemFair = item.verdict === "FAIR";

            return (
              <div
                key={idx}
                className={`p-3 rounded-lg border transition-colors ${
                  isItemOvercharged
                    ? "bg-zinc-950 border-red-900/50 hover:border-red-800"
                    : isItemFair
                    ? "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                    : "bg-zinc-950/70 border-zinc-850"
                }`}
              >
                {/* Header row: Drug name & verdict badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-zinc-100">
                        {item.drugName}
                      </span>
                      <span className="text-xs font-mono text-zinc-400">
                        (Qty: {item.quantity})
                      </span>
                    </div>
                    {item.matchedGenericName ? (
                      <div className="text-xs text-zinc-400 mt-0.5">
                        Matched Salt:{" "}
                        <span className="text-zinc-300">{item.matchedGenericName}</span>
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-400 mt-0.5 italic">
                        Not in reference dataset, cannot verify
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                        isItemOvercharged
                          ? "bg-red-950 text-red-400 border-red-800"
                          : isItemFair
                          ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                          : "bg-zinc-800 text-zinc-400 border-zinc-700"
                      }`}
                    >
                      {item.verdict}
                    </span>

                    {isItemOvercharged && (
                      <button
                        onClick={() => onOpenPharmacistCard(item)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
                        title="Show Pharmacist Discussion Card"
                      >
                        <MessageSquare className="w-3 h-3 text-red-400" />
                        Counter Card
                      </button>
                    )}
                  </div>
                </div>

                {/* Price metrics grid */}
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-zinc-900/80 p-2 rounded border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-400 block uppercase">Billed Price</span>
                    <span className="font-mono font-semibold text-zinc-200">
                      {formatINR(item.billedUnitPrice)}
                    </span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">
                      Total: {formatINR(item.billedLineTotal)}
                    </span>
                  </div>

                  <div className="bg-zinc-900/80 p-2 rounded border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-400 block uppercase">DPCO Ceiling</span>
                    <span className="font-mono font-semibold text-emerald-400">
                      {item.ceilingPricePerUnit !== null ? formatINR(item.ceilingPricePerUnit) : "N/A"}
                    </span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">
                      Max: {item.ceilingPriceForQty !== null ? formatINR(item.ceilingPriceForQty) : "N/A"}
                    </span>
                  </div>

                  <div
                    className={`p-2 rounded border ${
                      isItemOvercharged
                        ? "bg-red-950/30 border-red-900/60"
                        : "bg-zinc-900/80 border-zinc-800/80"
                    }`}
                  >
                    <span className="text-[10px] text-zinc-400 block uppercase">Overcharge</span>
                    <span
                      className={`font-mono font-semibold ${
                        isItemOvercharged ? "text-red-400" : "text-zinc-400"
                      }`}
                    >
                      {item.overchargeForLine !== null && item.overchargeForLine > 0
                        ? `+${formatINR(item.overchargeForLine)}`
                        : "₹0.00"}
                    </span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">
                      {item.overchargePerUnit !== null && item.overchargePerUnit > 0
                        ? `+${formatINR(item.overchargePerUnit)}/unit`
                        : "Compliant"}
                    </span>
                  </div>

                  <div className="bg-zinc-900/80 p-2 rounded border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-400 block uppercase">Regulation</span>
                    <span className="text-[11px] text-zinc-300 block truncate" title={item.regulatoryBasis || "DPCO 2013"}>
                      {item.regulatoryBasis || "DPCO 2013"}
                    </span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">
                      NPPA Gazette
                    </span>
                  </div>
                </div>

                {/* Generic Alternative suggestion if available */}
                {item.genericAlternative && (
                  <div className="mt-2.5 p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                    <div>
                      <span className="text-zinc-400">Cheaper Generic Equivalent: </span>
                      <span className="font-semibold text-zinc-200">
                        {item.genericAlternative}
                      </span>
                      {item.genericPrice !== null && (
                        <span className="text-emerald-400 font-mono ml-1.5">
                          ({formatINR(item.genericPrice)} / pack)
                        </span>
                      )}
                      <div className="text-[11px] text-amber-300/90 font-medium mt-0.5">
                        Ask your doctor or pharmacist about the generic equivalent.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Grievance Draft Component if overcharged */}
      {report.totalOvercharge > 0 && (
        <GrievanceDraft
          pharmacyName={pharmacyName}
          billNumber={billNumber}
          date={date}
          lineResults={report.lineResults}
          totalOvercharge={report.totalOvercharge}
        />
      )}
    </div>
  );
}
