"use client";

import { useState, useTransition } from "react";
import { addTicker } from "./actions";

export function AddTickerForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
      >
        + 銘柄を追加
      </button>
    );
  }

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await addTicker(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
      }
    });
  };

  return (
    <form action={handleSubmit} className="flex items-center gap-2">
      <input
        name="ticker"
        placeholder="銘柄コード (例: 7974)"
        required
        className="w-36 rounded-md border border-gray-300 px-3 py-2 text-sm"
        autoFocus
      />
      <input
        name="companyName"
        placeholder="企業名 (例: 任天堂)"
        required
        className="w-40 rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? "追加中..." : "追加"}
      </button>
      <button
        type="button"
        onClick={() => {
          setIsOpen(false);
          setError(null);
        }}
        className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        キャンセル
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </form>
  );
}
