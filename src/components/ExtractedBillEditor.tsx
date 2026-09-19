"use client";

import { Plus, Trash2, ShieldAlert, Sparkles } from "lucide-react";
import type { BillLineItem, ExtractedBill } from "@/data/schemas";

interface ExtractedBillEditorProps {
  bill: ExtractedBill;
  onChange: (updated: ExtractedBill) => void;
  onAudit: () => void;
  isAuditing: boolean;
}

export default function ExtractedBillEditor({
  bill,
  onChange,
  onAudit,
  isAuditing,
}: ExtractedBillEditorProps) {
  const handleMetadataChange = (
    field: "pharmacyName" | "billNumber" | "date",
    value: string
  ) => {
    onChange({
      ...bill,
      [field]: value.trim() === "" && field !== "pharmacyName" ? null : value,
    });
  };

  const handleLineItemChange = (
    index: number,
    field: keyof BillLineItem,
    value: string | number
  ) => {
    const updatedItems = [...bill.lineItems];
    const current = { ...updatedItems[index] };

    if (field === "drugName") {
      current.drugName = String(value);
    } else if (field === "quantity") {
      const q = Math.max(0, parseFloat(String(value)) || 0);
      current.quantity = q;
      current.lineTotal = Math.round(q * current.unitPrice * 100) / 100;
    } else if (field === "unitPrice") {
      const u = Math.max(0, parseFloat(String(value)) || 0);
      current.unitPrice = u;
      current.lineTotal = Math.round(current.quantity * u * 100) / 100;
    } else if (field === "lineTotal") {
      const lt = Math.max(0, parseFloat(String(value)) || 0);
      current.lineTotal = lt;
      if (current.quantity > 0) {
        current.unitPrice = Math.round((lt / current.quantity) * 100) / 100;
      }
    }

    updatedItems[index] = current;
    onChange({
      ...bill,
      lineItems: updatedItems,
    });
  };

  const handleAddRow = () => {
    const newItem: BillLineItem = {
      drugName: "",
      quantity: 10,
      unitPrice: 0,
      lineTotal: 0,
    };
    onChange({
      ...bill,
      lineItems: [...bill.lineItems, newItem],
    });
  };

  const handleRemoveRow = (index: number) => {
    const updated = bill.lineItems.filter((_, i) => i !== index);
    onChange({
      ...bill,
      lineItems: updated,
    });
  };

  return (
    <div className="bg-zinc-900 border border-zinc-700/60 rounded-xl p-4 text-zinc-100 shadow-sm">
      {/* Header and metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800">
        <div>
          <h3 className="text-xs font-semibold tracking-wider uppercase text-zinc-300">
            Bill Line Items & Details
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Review or edit extracted items before running price verification.
          </p>
        </div>
        <button
          onClick={onAudit}
          disabled={isAuditing || bill.lineItems.length === 0}
          className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:pointer-events-none text-black transition-colors cursor-pointer shrink-0 shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {isAuditing ? "Auditing..." : "Audit This Bill"}
        </button>
      </div>

      {/* Bill Metadata Fields */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block text-[11px] text-zinc-400 uppercase tracking-wider font-semibold mb-1">
            Pharmacy / Store
          </label>
          <input
            type="text"
            value={bill.pharmacyName}
            onChange={(e) => handleMetadataChange("pharmacyName", e.target.value)}
            placeholder="e.g. MedPlus Pharmacy"
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-zinc-600"
          />
        </div>
        <div>
          <label className="block text-[11px] text-zinc-400 uppercase tracking-wider font-semibold mb-1">
            Bill / Invoice #
          </label>
          <input
            type="text"
            value={bill.billNumber || ""}
            onChange={(e) => handleMetadataChange("billNumber", e.target.value)}
            placeholder="e.g. MP-2026-08734"
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 text-xs font-mono focus:outline-none focus:border-zinc-600"
          />
        </div>
        <div>
          <label className="block text-[11px] text-zinc-400 uppercase tracking-wider font-semibold mb-1">
            Bill Date
          </label>
          <input
            type="date"
            value={bill.date || ""}
            onChange={(e) => handleMetadataChange("date", e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 text-xs font-mono focus:outline-none focus:border-zinc-600"
          />
        </div>
      </div>

      {/* Line Items Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider font-semibold">
              <th className="py-2 pr-2">Drug Name (as on bill)</th>
              <th className="py-2 px-2 text-right w-20">Qty</th>
              <th className="py-2 px-2 text-right w-24">Unit (₹)</th>
              <th className="py-2 px-2 text-right w-24">Total (₹)</th>
              <th className="py-2 pl-2 w-8 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {bill.lineItems.map((item, idx) => (
              <tr key={idx} className="group hover:bg-zinc-800/30">
                <td className="py-1 pr-2">
                  <input
                    type="text"
                    value={item.drugName}
                    onChange={(e) => handleLineItemChange(idx, "drugName", e.target.value)}
                    placeholder="e.g. TELMI 40"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-zinc-100 text-xs font-medium focus:outline-none focus:border-zinc-600"
                  />
                </td>
                <td className="py-1 px-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantity}
                    onChange={(e) => handleLineItemChange(idx, "quantity", e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-zinc-200 text-right text-xs font-mono focus:outline-none focus:border-zinc-600"
                  />
                </td>
                <td className="py-1 px-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => handleLineItemChange(idx, "unitPrice", e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-zinc-200 text-right text-xs font-mono focus:outline-none focus:border-zinc-600"
                  />
                </td>
                <td className="py-1 px-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.lineTotal}
                    onChange={(e) => handleLineItemChange(idx, "lineTotal", e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-zinc-200 text-right text-xs font-mono focus:outline-none focus:border-zinc-600"
                  />
                </td>
                <td className="py-1 pl-2 text-center">
                  <button
                    onClick={() => handleRemoveRow(idx)}
                    className="p-1 text-zinc-500 hover:text-red-400 transition-colors rounded hover:bg-zinc-800 cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {bill.lineItems.length === 0 && (
        <div className="py-6 text-center text-xs text-zinc-400 border border-dashed border-zinc-800 rounded mt-2">
          No line items on this bill. Add rows manually or select a sample bill.
        </div>
      )}

      {/* Table Footer Actions */}
      <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-zinc-850 text-xs">
        <button
          onClick={handleAddRow}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Line Item
        </button>
        <span className="text-[11px] font-mono text-zinc-400">
          {bill.lineItems.length} {bill.lineItems.length === 1 ? "item" : "items"}
        </span>
      </div>
    </div>
  );
}
