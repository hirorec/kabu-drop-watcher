import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { createClient } from "@/lib/supabase/server";
import {
  buildSystemPrompt,
  type TickerContext,
} from "@/features/chat/prompt";

const MODEL_ID = "gpt-4o-mini";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return new Response("OPENAI_API_KEY is not configured", { status: 500 });
  }

  const body = (await req.json()) as {
    ticker?: string;
    messages?: UIMessage[];
  };

  const ticker = body.ticker?.trim();
  const messages = body.messages ?? [];

  if (!ticker) {
    return new Response("ticker is required", { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // ウォッチリスト登録済みのみ許可
  const { data: watchItem } = await supabase
    .from("watchlists")
    .select("ticker, company_name, memo")
    .eq("user_id", user.id)
    .eq("ticker", ticker)
    .maybeSingle();

  if (!watchItem) {
    return new Response("Not found", { status: 404 });
  }

  // 銘柄コンテキストを並列取得
  const [
    { data: snapshots },
    { data: analysis },
    { data: events },
  ] = await Promise.all([
    supabase
      .from("price_snapshots")
      .select("price, change_pct, captured_at")
      .eq("ticker", ticker)
      .order("captured_at", { ascending: false })
      .limit(5),
    supabase
      .from("analysis_results")
      .select(
        "summary, reason_label, structural_classification, kpi_status, guidance_status, score, created_at"
      )
      .eq("ticker", ticker)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("earnings_events")
      .select("announced_at, period, raw_text")
      .eq("ticker", ticker)
      .order("announced_at", { ascending: false })
      .limit(3),
  ]);

  const snaps = snapshots ?? [];
  const context: TickerContext = {
    ticker: watchItem.ticker,
    company_name: watchItem.company_name,
    memo: watchItem.memo,
    latest_price: snaps[0]
      ? {
          price: snaps[0].price,
          change_pct: snaps[0].change_pct,
          captured_at: snaps[0].captured_at,
        }
      : null,
    latest_analysis: analysis
      ? {
          summary: analysis.summary,
          reason_label: analysis.reason_label,
          structural_classification: analysis.structural_classification,
          kpi_status: analysis.kpi_status,
          guidance_status: analysis.guidance_status,
          score: analysis.score,
          created_at: analysis.created_at,
        }
      : null,
    recent_events: (events ?? []).map((e) => ({
      announced_at: e.announced_at,
      period: e.period,
      raw_text: e.raw_text ?? "",
    })),
    recent_prices: snaps.slice(1).map((s) => ({
      captured_at: s.captured_at,
      price: s.price,
      change_pct: s.change_pct,
    })),
  };

  const modelMessages = await convertToModelMessages(messages);
  const result = streamText({
    model: openai(MODEL_ID),
    system: buildSystemPrompt(context),
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
