"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { markAsRead } from "./actions";

type Notification = {
  id: string;
  ticker: string;
  type: string;
  title: string;
  body: string | null;
  source_id: string | null;
  sent_at: string;
  opened_at: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  disclosure_analysis: "分析",
  price_drop: "急落",
};

function buildTargetHref(item: Notification): string {
  if (item.type === "disclosure_analysis" && item.source_id) {
    return `/ticker/${item.ticker}#analysis-${item.source_id}`;
  }
  return `/ticker/${item.ticker}`;
}

export function NotificationItem({ item }: { item: Notification }) {
  const [isPending, startTransition] = useTransition();
  const isUnread = !item.opened_at;
  const href = buildTargetHref(item);

  const handleMarkRead = () => {
    startTransition(async () => {
      await markAsRead(item.id);
    });
  };

  return (
    <div
      className={`rounded-md border p-4 ${
        isUnread ? "border-gray-300 bg-white" : "border-gray-100 bg-gray-50"
      } ${isPending ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {isUnread && (
              <span
                aria-label="未読"
                className="inline-block h-2 w-2 shrink-0 rounded-full bg-blue-500"
              />
            )}
            <Badge variant="outline" className="text-xs">
              {TYPE_LABEL[item.type] ?? item.type}
            </Badge>
            <Link
              href={href}
              className="font-mono text-sm font-medium hover:underline"
            >
              {item.ticker}
            </Link>
          </div>
          <Link href={href} className="block hover:underline">
            <p className="text-sm font-medium text-gray-900">{item.title}</p>
          </Link>
          {item.body && (
            <p className="whitespace-pre-wrap text-sm text-gray-600">
              {item.body}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="text-xs text-gray-400">
            {formatDistanceToNow(new Date(item.sent_at), {
              addSuffix: true,
              locale: ja,
            })}
          </span>
          {isUnread && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkRead}
              disabled={isPending}
              className="h-7 px-2 text-xs"
            >
              <Check className="mr-1 h-3 w-3" />
              既読
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
