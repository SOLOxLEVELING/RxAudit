"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import {
  Upload,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
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
      setErrorMessage(
        "File exceeds 10MB limit. Please upload a smaller image."
      );
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

      const contentType = res.headers.get("content-type") || "";
      let data: {
        success?: boolean;
        bill?: ExtractedBill;
        error?: string;
      } | null = null;

      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        if (res.status === 413) {
          throw new Error(
            "File size exceeds server upload limit. Please upload a smaller image."
          );
        }
        if (res.status === 404) {
          throw new Error(
            "API endpoint not reachable. Please verify the dev server is active on port 3000."
          );
        }
        throw new Error(
          `Server returned an unexpected response (${res.status}). Please verify the dev server is running on port 3000.`
        );
      }

      if (!res.ok || !data?.success || !data?.bill) {
        throw new Error(
          data?.error || "Failed to extract text from bill image."
        );
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
      {/* Sample Bill Selector — lightweight row above dropzone, no card */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mr-1 shrink-0">
          Try a sample:
        </span>
        {sampleBills.map((sample) => {
          const isSelected = activeSampleName === sample.name;
          const shortName = sample.name.replace("Sample: ", "");
          return (
            <button
              key={sample.name}
              type="button"
              onClick={() => handleSelectSample(sample)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                isSelected
                  ? "bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-sm"
                  : "bg-zinc-900 border-zinc-700/60 text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
              }`}
            >
              {isSelected ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              )}
              {shortName}
            </button>
          );
        })}
      </div>

      {/* Upload Dropzone — tall, prominent, inviting */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isExtracting && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl text-center transition-all cursor-pointer ${
          dragOver
            ? "border-emerald-500 bg-emerald-950/10"
            : "border-zinc-700/60 bg-zinc-900/40 hover:border-zinc-600 hover:bg-zinc-900/60"
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
          /* Loading state */
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            <div className="font-semibold text-zinc-200 text-sm">
              Reading your bill...
            </div>
            <div className="text-xs text-zinc-500">
              AI vision is extracting line items and prices
            </div>
          </div>
        ) : (
          /* Default state */
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-emerald-400/60">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-zinc-100 text-sm sm:text-base">
                Upload your pharmacy bill
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                PNG, JPEG, WebP or PDF · up to 10 MB · drag &amp; drop or click
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-red-950/40 border border-red-900/60 rounded-xl p-3 text-xs text-red-300 flex items-start gap-2">
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
