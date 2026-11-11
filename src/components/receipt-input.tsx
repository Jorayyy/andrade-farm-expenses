"use client";

import { useState } from "react";
import { ImageIcon, Paperclip } from "lucide-react";

async function compressImage(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image."));
    img.src = dataUrl;
  });

  const maxSize = 1400;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) return dataUrl;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.75);
}

export function ReceiptInput({ existingReceiptId }: { existingReceiptId?: string | null }) {
  const [dataUrl, setDataUrl] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <input type="hidden" name="receiptData" value={dataUrl} />
      <input type="hidden" name="receiptName" value={name} />

      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-600 transition hover:border-emerald-400 hover:bg-emerald-50/50">
        <Paperclip className="h-4 w-4" />
        <span>Attach receipt photo (optional)</span>
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) {
              setDataUrl("");
              setName("");
              return;
            }
            if (!file.type.startsWith("image/")) {
              setError("Please choose an image file.");
              return;
            }
            try {
              const compressed = await compressImage(file);
              setDataUrl(compressed);
              setName(file.name);
              setError(null);
            } catch {
              setError("Could not process that image.");
            }
          }}
        />
      </label>

      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}

      {dataUrl ? (
        <div className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt="Receipt preview" className="h-16 w-16 rounded object-cover" />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-stone-700">{name}</p>
            <button
              type="button"
              className="text-xs font-semibold text-red-600 hover:underline"
              onClick={() => {
                setDataUrl("");
                setName("");
              }}
            >
              Remove
            </button>
          </div>
        </div>
      ) : existingReceiptId ? (
        <a
          href={`/api/receipts/${existingReceiptId}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline"
        >
          <ImageIcon className="h-4 w-4" /> View current receipt
        </a>
      ) : (
        <p className="text-xs text-stone-400">No receipt attached.</p>
      )}
    </div>
  );
}
