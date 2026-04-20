import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchQuotes } from "@/lib/stock";
import type { Database } from "@/types/supabase";

// Cron ジョブ用に service_role キーで Supabase クライアントを作成
// RLS をバイパスして全ユーザーのウォッチリストを取得する
function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Vercel Cron からの呼び出しを認証する
const CRON_SECRET = process.env.CRON_SECRET;

// 急落と判定する閾値（%）
const DROP_THRESHOLD = -5;

export async function GET(request: Request) {
  // Cron 認証チェック
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();

  // 有効な全ウォッチリスト銘柄を取得（重複排除）
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

  const uniqueTickers = [...new Set(watchlists.map((w) => w.ticker))];

  if (uniqueTickers.length === 0) {
    return NextResponse.json({ message: "No tickers to monitor", count: 0 });
  }

  // 株価取得
  let quotes;
  try {
    quotes = await fetchQuotes(uniqueTickers);
  } catch (error) {
    console.error("株価取得エラー:", error);
    return NextResponse.json(
      { error: "Failed to fetch quotes" },
      { status: 500 }
    );
  }

  // price_snapshots に保存
  const now = new Date().toISOString();
  const snapshots = quotes.map((q) => ({
    ticker: q.ticker,
    captured_at: now,
    price: q.price,
    change_pct: q.changePct,
    volume: q.volume,
  }));

  if (snapshots.length > 0) {
    const { error: insertError } = await supabase
      .from("price_snapshots")
      .insert(snapshots);

    if (insertError) {
      console.error("スナップショット保存エラー:", insertError);
      return NextResponse.json(
        { error: "Failed to save snapshots" },
        { status: 500 }
      );
    }
  }

  // 急落銘柄を検出
  const drops = quotes.filter((q) => q.changePct <= DROP_THRESHOLD);

  if (drops.length > 0) {
    console.log(
      `急落検知: ${drops.map((d) => `${d.ticker} (${d.changePct.toFixed(2)}%)`).join(", ")}`
    );
  }

  return NextResponse.json({
    message: "Price monitor completed",
    monitored: quotes.length,
    drops: drops.map((d) => ({
      ticker: d.ticker,
      price: d.price,
      changePct: d.changePct,
    })),
  });
}
