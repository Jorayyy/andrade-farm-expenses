"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { btn } from "@/components/ui";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-stone-900">Something went wrong</h1>
        <p className="mt-1 text-sm text-stone-500">
          The page could not be loaded. Your saved data has not been changed by this error.
        </p>
        <button type="button" onClick={reset} className={`${btn.primary} mt-5`}>
          Try again
        </button>
      </div>
    </main>
  );
}
