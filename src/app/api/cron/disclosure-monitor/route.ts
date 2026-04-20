import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchEarningsDisclosures, tickerToSecCode } from "@/lib/edinet";
import type { Database } from "@/types/supabase";

function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  // Cron 認証チェック
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // EDINET_API_KEY の存在チェック
  if (!process.env.EDINET_API_KEY) {
    return NextResponse.json(
      { error: "EDINET_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const supabase = createAdminClient();

  // 有効な全ウォッチリスト銘柄を取得
  const { data: watchlists, error: watchlistError } = await supabase
    .from("watchlists")
    .select("ticker")
    .eq("enabled", true);

  if (watchlistError) {
    console.error("ウォッチリスト取得エラー:", watchlistError);
    return NextResponse.json(
      { error: "Failed to fetch watchlists" },
      { status: 500 }
    );
  }

  const watchedSecCodes = new Set(
    watchlists.map((w) => tickerToSecCode(w.ticker))
  );

  if (watchedSecCodes.size === 0) {
    return NextResponse.json({ message: "No tickers to monitor", count: 0 });
  }

  // 当日の適時開示を取得
  let disclosures;
  try {
    disclosures = await fetchEarningsDisclosures(new Date(), watchedSecCodes);
  } catch (error) {
    console.error("EDINET API エラー:", error);
    return NextResponse.json(
      { error: "Failed to fetch disclosures" },
      { status: 500 }
    );
  }

  if (disclosures.length === 0) {
    return NextResponse.json({
      message: "No new earnings disclosures found",
      count: 0,
    });
  }

  // 既に保存済みの docID を確認（重複防止）
  const docIds = disclosures.map((d) => d.docID);
  const { data: existing } = await supabase
    .from("earnings_events")
    .select("source_url")
    .in("source_url", docIds);

  const existingDocIds = new Set(existing?.map((e) => e.source_url) ?? []);
  const newDisclosures = disclosures.filter(
    (d) => !existingDocIds.has(d.docID)
  );

  if (newDisclosures.length === 0) {
    return NextResponse.json({
      message: "All disclosures already processed",
      count: 0,
    });
  }

  // earnings_events に保存
  const events = newDisclosures.map((d) => ({
    ticker: d.secCode ? d.secCode.slice(0, 4) : "",
    announced_at: d.submitDateTime,
    period: d.periodEnd
      ? `${d.periodStart ?? ""} ~ ${d.periodEnd}`
      : null,
    source_url: d.docID,
    raw_text: `${d.filerName}: ${d.docDescription}`,
  }));

  const { error: insertError } = await supabase
    .from("earnings_events")
    .insert(events);

  if (insertError) {
    console.error("イベント保存エラー:", insertError);
    return NextResponse.json(
      { error: "Failed to save events" },
      { status: 500 }
    );
  }

  console.log(
    `適時開示検知: ${newDisclosures.map((d) => `${d.filerName} - ${d.docDescription}`).join(", ")}`
  );

  return NextResponse.json({
    message: "Disclosure monitor completed",
    count: newDisclosures.length,
    disclosures: newDisclosures.map((d) => ({
      ticker: d.secCode?.slice(0, 4),
      filerName: d.filerName,
      description: d.docDescription,
      submitDateTime: d.submitDateTime,
    })),
  });
}
