"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { addSuggestedTicker } from "./actions";

export type SuggestionDisplay = {
  id: string;
  ticker: string;
  company_name: string;
  reasoning: string | null;
  score: number | null;
};

export function SuggestionList({ items }: { items: SuggestionDisplay[] }) {
  // 追加済みの ticker を保持して UI から即時除外
  const [addedTickers, setAddedTickers] = useState<Set<string>>(new Set());
  const [pendingTicker, setPendingTicker] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visibleItems = items.filter((i) => !addedTickers.has(i.ticker));

  if (visibleItems.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        現在おすすめできる候補はありません。
      </p>
    );
  }

  const handleAdd = (item: SuggestionDisplay) => {
    setPendingTicker(item.ticker);
    startTransition(async () => {
      const result = await addSuggestedTicker(item.ticker, item.company_name);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`${item.ticker} ${item.company_name} を監視対象に追加しました`);
        setAddedTickers((prev) => new Set(prev).add(item.ticker));
      }
      setPendingTicker(null);
    });
  };

  return (
    <div className="space-y-3">
      {visibleItems.map((item) => {
        const rowPending = isPending && pendingTicker === item.ticker;
        return (
          <div
            key={item.id}
            className={`rounded-md border border-gray-100 p-3 ${
              rowPending ? "opacity-50" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/ticker/${item.ticker}`}
                    className="font-mono text-sm font-medium hover:underline"
                  >
                    {item.ticker}
                  </Link>
                  <span className="text-sm text-gray-500">
                    {item.company_name}
                  </span>
                  {item.score !== null && (
                    <Badge variant="default" className="text-xs">
                      スコア {item.score}
                    </Badge>
                  )}
                </div>
                {item.reasoning && (
                  <p className="text-sm text-gray-600">{item.reasoning}</p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAdd(item)}
                disabled={rowPending}
                className="shrink-0"
              >
                <Plus className="mr-1 h-3 w-3" />
                追加
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SuggestionHeading() {
  return (
    <div className="flex items-center gap-2">
      <Sparkles className="h-5 w-5 text-purple-500" />
      <span>監視候補（AI 選定）</span>
    </div>
  );
}
