"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Upload, FileText, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { sampleBills } from "@/data/sample-bills";
import type { ExtractedBill } from "@/data/schemas";

interface BillUploadProps {
  onBillLoaded: (bill: ExtractedBill, autoAudit?: boolean) => void;
  isExtracting: boolean;
  setIsExtracting: (val: boolean) => void;
  activeSampleName: string | null;
  setActiveSampleName: (name: string | null) => void;
}

export default function BillUpload({
  onBillLoaded,
  isExtracting,
  setIsExtracting,
  activeSampleName,
  setActiveSampleName,
}: BillUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectSample = (sample: (typeof sampleBills)[0]) => {
    setErrorMessage(null);
    setActiveSampleName(sample.name);
    // Passing true triggers immediate automatic audit
    onBillLoaded(sample.bill, true);
  };

  const handleProcessFile = async (file: File) => {
    setErrorMessage(null);
    setActiveSampleName(null);

    const validMimes = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "application/pdf",
    ];

    if (!validMimes.includes(file.type)) {
      setErrorMessage(
        "Unsupported file type. Please upload a PNG, JPEG, WebP image, or PDF."
      );
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("File exceeds 10MB limit. Please upload a smaller image.");
      return;
    }

    setIsExtracting(true);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Extract the pure base64 without data:image/xxx;base64, prefix
          const base64 = result.split(",")[1] || result;
          resolve(base64);
        };
        reader.onerror = reject;
      });

      reader.readAsDataURL(file);
      const fileBase64 = await base64Promise;

      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileBase64,
          mimeType: file.type,
          fileName: file.name,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to extract text from bill image.");
      }

      onBillLoaded(data.bill, false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to extract bill image.";
      setErrorMessage(
        `${msg} (Tip: You can use one of the guaranteed sample bills above or enter items manually below.)`
      );
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-3">
      {/* Sample Bill Selector */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Instant Demo Fixtures
          </span>
          <span className="text-[10px] text-zinc-400">Deterministic · No AWS needed</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {sampleBills.map((sample) => {
            const isSelected = activeSampleName === sample.name;
            return (
              <button
                key={sample.name}
                onClick={() => handleSelectSample(sample)}
                className={`text-left p-2.5 rounded border transition-colors cursor-pointer text-xs ${
                  isSelected
                    ? "bg-zinc-800/90 border-emerald-500 text-zinc-100"
                    : "bg-zinc-950/80 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium truncate">{sample.name.replace("Sample: ", "")}</div>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />}
                </div>
                <div className="text-[11px] text-zinc-400 mt-1 font-mono">
                  {sample.bill.lineItems.length} items · {sample.bill.pharmacyName.split(" - ")[0]}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isExtracting && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
          dragOver
            ? "border-emerald-500 bg-zinc-900/80"
            : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70"
        } ${isExtracting ? "pointer-events-none opacity-80" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        {isExtracting ? (
          <div className="py-3 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
            <div className="text-xs font-semibold text-zinc-200">
              Extracting with AI vision...
            </div>
            <div className="text-[11px] text-zinc-400">
              Bedrock Nova Pro is reading printed line items & prices
            </div>
          </div>
        ) : (
          <div className="py-2 flex flex-col items-center justify-center gap-2">
            <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 text-zinc-300">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-200">
                Upload pharmacy bill photo or PDF
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                Drag and drop here, or click to browse (PNG, JPEG, WebP, PDF up to 10MB)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-red-950/40 border border-red-900/60 rounded-lg p-3 text-xs text-red-300 flex items-start gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <span className="font-semibold text-red-200">Extraction Note: </span>
            {errorMessage}
          </div>
        </div>
      )}
    </div>
  );
}
