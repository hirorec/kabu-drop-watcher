"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type SaveAlertRuleResult =
  | { success: true }
  | { error: string };

export async function saveAlertRule(
  formData: FormData
): Promise<SaveAlertRuleResult> {
  const minDropPctRaw = formData.get("min_drop_pct") as string | null;
  const minScoreRaw = formData.get("min_score") as string | null;

  const minDropPct = Number(minDropPctRaw);
  const minScore = Number(minScoreRaw);

  if (!Number.isFinite(minDropPct) || minDropPct < 0 || minDropPct > 50) {
    return { error: "急落閾値は 0〜50 の数値で入力してください" };
  }
  if (!Number.isFinite(minScore) || minScore < 0 || minScore > 100) {
    return { error: "最小スコアは 0〜100 の数値で入力してください" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です" };
  }

  // 既存レコードを確認
  const { data: existing } = await supabase
    .from("user_alert_rules")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("user_alert_rules")
      .update({ min_drop_pct: minDropPct, min_score: minScore })
      .eq("id", existing.id);

    if (error) {
      return { error: "更新に失敗しました" };
    }
  } else {
    const { error } = await supabase.from("user_alert_rules").insert({
      user_id: user.id,
      min_drop_pct: minDropPct,
      min_score: minScore,
    });

    if (error) {
      return { error: "保存に失敗しました" };
    }
  }

  revalidatePath("/settings");
  return { success: true };
}
