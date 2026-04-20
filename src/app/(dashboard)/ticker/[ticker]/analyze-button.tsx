"use client";

import { useTransition } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { analyzeNow } from "./actions";

export function AnalyzeButton({ ticker }: { ticker: string }) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const result = await analyzeNow(ticker);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("AI 分析を追加しました");
      }
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      <Sparkles className="mr-1 h-4 w-4" />
      {isPending ? "分析中..." : "今すぐ AI 分析"}
    </Button>
  );
}
