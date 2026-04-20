"use client";

import { useTransition } from "react";
import { removeTicker, toggleTicker } from "./actions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import type { Database } from "@/types/supabase";

type WatchlistItem = Database["public"]["Tables"]["watchlists"]["Row"];

export function WatchlistTable({ items }: { items: WatchlistItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
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
    <div className="rounded-lg border border-gray-200">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 hover:bg-gray-50">
            <TableHead className="w-16">監視</TableHead>
            <TableHead className="w-28">銘柄コード</TableHead>
            <TableHead>企業名</TableHead>
            <TableHead>メモ</TableHead>
            <TableHead className="w-20">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <WatchlistRow key={item.id} item={item} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function WatchlistRow({ item }: { item: WatchlistItem }) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = (checked: boolean) => {
    startTransition(async () => {
      await toggleTicker(item.id, checked);
    });
  };

  const handleRemove = () => {
    startTransition(async () => {
      await removeTicker(item.id);
    });
  };

  return (
    <TableRow className={isPending ? "opacity-50" : ""}>
      <TableCell>
        <Switch
          checked={item.enabled}
          onCheckedChange={handleToggle}
          disabled={isPending}
        />
      </TableCell>
      <TableCell>
        <span className="font-mono font-medium">{item.ticker}</span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {item.company_name}
          {!item.enabled && (
            <Badge variant="outline">停止中</Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-gray-500">
        {item.memo || "—"}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          disabled={isPending}
          className="text-red-600 hover:text-red-800 hover:bg-red-50"
        >
          削除
        </Button>
      </TableCell>
    </TableRow>
  );
}
