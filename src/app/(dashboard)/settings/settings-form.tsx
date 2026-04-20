"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { saveAlertRule } from "./actions";

type Props = {
  initialMinDropPct: number;
  initialMinScore: number;
  initialEmailEnabled: boolean;
};

export function SettingsForm({
  initialMinDropPct,
  initialMinScore,
  initialEmailEnabled,
}: Props) {
  const [minDropPct, setMinDropPct] = useState(String(initialMinDropPct));
  const [minScore, setMinScore] = useState(String(initialMinScore));
  const [emailEnabled, setEmailEnabled] = useState(initialEmailEnabled);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set("min_drop_pct", minDropPct);
    formData.set("min_score", minScore);
    formData.set("email_enabled", emailEnabled ? "true" : "false");

    startTransition(async () => {
      const result = await saveAlertRule(formData);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("保存しました");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="min_drop_pct">急落アラート閾値（%）</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">−</span>
          <Input
            id="min_drop_pct"
            name="min_drop_pct"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            max="50"
            value={minDropPct}
            onChange={(e) => setMinDropPct(e.target.value)}
            className="w-28"
            disabled={isPending}
          />
          <span className="text-sm text-gray-500">% 以下で通知</span>
        </div>
        <p className="text-xs text-gray-400">
          例: 5 と入力すると、前日比 -5% 以下で急落アラートを発火します。
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="min_score">AI 分析 最小スコア</Label>
        <div className="flex items-center gap-2">
          <Input
            id="min_score"
            name="min_score"
            type="number"
            inputMode="numeric"
            step="1"
            min="0"
            max="100"
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            className="w-28"
            disabled={isPending}
          />
          <span className="text-sm text-gray-500">以上で通知</span>
        </div>
        <p className="text-xs text-gray-400">
          0〜100 の範囲。例: 60 ならスコア 60 以上の分析結果だけを通知します。
        </p>
      </div>

      <div className="flex items-center justify-between rounded-md border border-gray-100 p-3">
        <div>
          <p className="text-sm font-medium">メール通知</p>
          <p className="text-xs text-gray-400">
            閾値を超えるアラートをメールで受け取ります（Resend 経由）。
          </p>
        </div>
        <Switch
          checked={emailEnabled}
          onCheckedChange={setEmailEnabled}
          disabled={isPending}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "保存中..." : "保存"}
        </Button>
      </div>
    </form>
  );
}
