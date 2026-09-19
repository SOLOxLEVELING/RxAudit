"use client";

import { TrendingUp, AlertCircle } from "lucide-react";
import { formatINR } from "@/lib/formatters";

interface AnnualImpactProps {
  totalOvercharge: number;
}

export default function AnnualImpact({ totalOvercharge }: AnnualImpactProps) {
  const annualOvercharge = totalOvercharge * 12;

  if (totalOvercharge <= 0) {
    return null;
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-zinc-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-red-400" />
          <span className="text-xs font-semibold tracking-wider uppercase text-zinc-300">
            Compounded Refill Cost
          </span>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-900/60">
          Annual Drain
        </span>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div>
          <div className="text-2xl font-mono font-bold text-red-400">
            {formatINR(annualOvercharge)}
            <span className="text-xs font-normal text-zinc-400 ml-1">/year</span>
          </div>
          <div className="text-xs text-zinc-400 mt-1">
            Estimated annual impact (assuming monthly refills)
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-zinc-800/80 text-xs text-zinc-400 flex items-start gap-1.5 leading-relaxed">
        <AlertCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
        <span>
          A single bill overcharge of <span className="font-mono text-zinc-200">{formatINR(totalOvercharge)}</span> quietly multiplies across 12 monthly refills for chronic hypertension or diabetes care.
        </span>
      </div>
    </div>
  );
}
