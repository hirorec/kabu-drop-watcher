import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { analyzeDisclosure } from "@/features/analysis/analyze";
import type { Database } from "@/types/supabase";

function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const CRON_SECRET = process.env.CRON_SECRET;
const BATCH_SIZE = 10;

export async function GET(request: Request) {
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const supabase = createAdminClient();

  // 既に分析済みの event_id を取得
  const { data: analyzed, error: analyzedError } = await supabase
    .from("analysis_results")
    .select("event_id");

  if (analyzedError) {
    console.error("analysis_results 取得エラー:", analyzedError);
    return NextResponse.json(
      { error: "Failed to fetch analyzed events" },
      { status: 500 }
    );
  }

  const analyzedIds = new Set(
    (analyzed ?? []).map((a) => a.event_id).filter((id): id is string => !!id)
  );

  // 未分析の earnings_events を新しい順に取得
  const { data: events, error: eventsError } = await supabase
    .from("earnings_events")
    .select("id, ticker, announced_at, period, raw_text")
    .order("announced_at", { ascending: false })
    .limit(BATCH_SIZE * 3);

  if (eventsError) {
    console.error("earnings_events 取得エラー:", eventsError);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }

  const targets = (events ?? [])
    .filter((e) => !analyzedIds.has(e.id))
    .slice(0, BATCH_SIZE);

  if (targets.length === 0) {
    return NextResponse.json({
      message: "No events to analyze",
      count: 0,
    });
  }

  const succeeded: { event_id: string; ticker: string }[] = [];
  const failed: { event_id: string; ticker: string; error: string }[] = [];

  // 逐次実行（レート制御・モデル側の制約を優先）
  for (const event of targets) {
    try {
      const result = await analyzeDisclosure({
        ticker: event.ticker,
        announced_at: event.announced_at,
        period: event.period,
        raw_text: event.raw_text ?? "",
      });

      const { error: insertError } = await supabase
        .from("analysis_results")
        .insert({
          event_id: event.id,
          ticker: event.ticker,
          summary: result.summary,
          reason_label: result.reason_label,
          structural_classification: result.structural_classification,
          kpi_status: result.kpi_status,
          guidance_status: result.guidance_status,
          score: result.score,
          json_result: result,
        });

      if (insertError) {
        throw new Error(`DB insert failed: ${insertError.message}`);
      }

      succeeded.push({ event_id: event.id, ticker: event.ticker });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      console.error(
        `分析失敗 event_id=${event.id} ticker=${event.ticker}:`,
        message
      );
      failed.push({
        event_id: event.id,
        ticker: event.ticker,
        error: message,
      });
    }
  }

  console.log(
    `AI分析ジョブ: 成功 ${succeeded.length}件 / 失敗 ${failed.length}件`
  );

  return NextResponse.json({
    message: "Analysis runner completed",
    succeeded_count: succeeded.length,
    failed_count: failed.length,
    succeeded,
    failed,
  });
}
