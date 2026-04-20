"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { analyzeTickerManually } from "@/features/analysis/analyze";
import { fetchDailyOhlc } from "@/lib/stock";

export type AnalyzeNowResult =
  | { success: true }
  | { error: string };

export async function analyzeNow(ticker: string): Promise<AnalyzeNowResult> {
  if (!ticker) return { error: "銘柄が指定されていません" };
  if (!process.env.OPENAI_API_KEY) {
    return { error: "OPENAI_API_KEY が設定されていません" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "認証が必要です" };

  // ウォッチリスト登録済みかを確認
  const { data: watchItem } = await supabase
    .from("watchlists")
    .select("ticker, company_name")
    .eq("user_id", user.id)
    .eq("ticker", ticker)
    .maybeSingle();

  if (!watchItem) return { error: "監視対象に登録されていません" };

  // 最新の開示と価格を取得
  const [{ data: events }, { data: prices }] = await Promise.all([
    supabase
      .from("earnings_events")
      .select("id, announced_at, period, raw_text")
      .eq("ticker", ticker)
      .order("announced_at", { ascending: false })
      .limit(3),
    supabase
      .from("price_snapshots")
      .select("captured_at, price, change_pct")
      .eq("ticker", ticker)
      .order("captured_at", { ascending: false })
      .limit(10),
  ]);

  const latestDisclosures = (events ?? []).map((e) => ({
    announced_at: e.announced_at,
    period: e.period,
    raw_text: e.raw_text ?? "",
  }));
  let recentPrices = (prices ?? []).map((p) => ({
    captured_at: p.captured_at,
    price: p.price,
    change_pct: p.change_pct as number | null,
  }));

  // 株価スナップショットが無い場合は Yahoo Finance から日足を取得してフォールバック
  if (recentPrices.length === 0) {
    try {
      const ohlc = await fetchDailyOhlc(ticker, "1M");
      // 直近10日分を新しい順に整形。change_pct は前日終値との差から算出
      const recent = ohlc.slice(-11);
      const tail: typeof recentPrices = [];
      for (let i = 1; i < recent.length; i++) {
        const prev = recent[i - 1].close;
        const curr = recent[i];
        const pct = prev > 0 ? ((curr.close - prev) / prev) * 100 : null;
        tail.push({
          captured_at: new Date(curr.time).toISOString(),
          price: curr.close,
          change_pct: pct,
        });
      }
      recentPrices = tail.reverse();
    } catch (error) {
      console.warn("日足フォールバック取得失敗:", error);
    }
  }

  if (latestDisclosures.length === 0 && recentPrices.length === 0) {
    return {
      error: "分析に使える開示・株価データが取得できませんでした",
    };
  }

  let result;
  try {
    result = await analyzeTickerManually({
      ticker,
      company_name: watchItem.company_name,
      latest_disclosures: latestDisclosures,
      recent_prices: recentPrices,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("手動分析失敗:", message);
    return { error: "AI 分析に失敗しました" };
  }

  const latestEventId = events?.[0]?.id ?? null;

  const { error: insertError } = await supabase
    .from("analysis_results")
    .insert({
      event_id: latestEventId,
      ticker,
      summary: result.summary,
      reason_label: result.reason_label,
      structural_classification: result.structural_classification,
      kpi_status: result.kpi_status,
      guidance_status: result.guidance_status,
      score: result.score,
      json_result: result,
    });

  if (insertError) {
    return { error: "分析結果の保存に失敗しました" };
  }

  revalidatePath(`/ticker/${ticker}`);
  return { success: true };
}
