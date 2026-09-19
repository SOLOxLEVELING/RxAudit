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
    <div className="bg-zinc-900 border border-zinc-700/60 rounded-lg p-3 text-zinc-100">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
          Compounded Refill Cost
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/50 text-amber-400 border border-amber-900/40 font-mono">
          Annual Projection
        </span>
      </div>

      <div className="text-lg font-mono font-semibold text-zinc-100 mt-1">
        {formatINR(annualOvercharge)}
        <span className="text-xs font-normal text-zinc-400 ml-1 font-sans">/year</span>
      </div>

      <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
        Estimated annual impact (assuming monthly refills)
      </div>
    </div>
  );
}
