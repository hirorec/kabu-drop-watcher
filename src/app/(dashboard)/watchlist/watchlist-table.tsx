"use client";

import { useTransition } from "react";
import { removeTicker, toggleTicker } from "./actions";
import type { Database } from "@/types/supabase";

type WatchlistItem = Database["public"]["Tables"]["watchlists"]["Row"];

export function WatchlistTable({ items }: { items: WatchlistItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-gray-300 p-12 text-center">
        <p className="text-sm text-gray-500">
          ウォッチリストに銘柄が登録されていません。
        </p>
        <p className="mt-1 text-sm text-gray-400">
          「+ 銘柄を追加」から監視したい銘柄を登録してください。
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-500">
          <tr>
            <th className="px-4 py-3 font-medium">有効</th>
            <th className="px-4 py-3 font-medium">銘柄コード</th>
            <th className="px-4 py-3 font-medium">企業名</th>
            <th className="px-4 py-3 font-medium">メモ</th>
            <th className="px-4 py-3 font-medium">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {items.map((item) => (
            <WatchlistRow key={item.id} item={item} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WatchlistRow({ item }: { item: WatchlistItem }) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      await toggleTicker(item.id, !item.enabled);
    });
  };

  const handleRemove = () => {
    startTransition(async () => {
      await removeTicker(item.id);
    });
  };

  return (
    <tr className={isPending ? "opacity-50" : ""}>
      <td className="px-4 py-3">
        <button
          onClick={handleToggle}
          disabled={isPending}
          className="text-lg"
          title={item.enabled ? "監視中" : "停止中"}
        >
          {item.enabled ? "🟢" : "⚪"}
        </button>
      </td>
      <td className="px-4 py-3 font-mono font-medium">{item.ticker}</td>
      <td className="px-4 py-3">{item.company_name}</td>
      <td className="px-4 py-3 text-gray-500">{item.memo || "—"}</td>
      <td className="px-4 py-3">
        <button
          onClick={handleRemove}
          disabled={isPending}
          className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
        >
          削除
        </button>
      </td>
    </tr>
  );
}
