import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { fetchQuotes } from "@/lib/stock";
import { WatchlistTable, type PriceInfo } from "./watchlist-table";
import { AddTickerForm } from "./add-ticker-form";

export default async function WatchlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: watchlists } = await supabase
    .from("watchlists")
    .select("*")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  const items = watchlists ?? [];
  const tickers = items.map((w) => w.ticker);

  // ウォッチリスト銘柄の最新スナップショットをまとめて取得
  const priceMap = new Map<string, PriceInfo>();
  if (tickers.length > 0) {
    const { data: snapshots } = await supabase
      .from("price_snapshots")
      .select("ticker, price, change_pct, captured_at")
      .in("ticker", tickers)
      .order("captured_at", { ascending: false });

    for (const s of snapshots ?? []) {
      if (!priceMap.has(s.ticker)) {
        priceMap.set(s.ticker, {
          price: s.price,
          change_pct: s.change_pct,
          captured_at: s.captured_at,
        });
      }
    }

    // スナップショットが無い銘柄は Yahoo Finance で一括フォールバック
    const missing = tickers.filter((t) => !priceMap.has(t));
    if (missing.length > 0) {
      try {
        const quotes = await fetchQuotes(missing);
        if (quotes.length > 0) {
          const now = new Date().toISOString();
          const admin = createAdminClient();
          const rows = quotes.map((q) => ({
            ticker: q.ticker,
            price: q.price,
            change_pct: q.changePct,
            volume: q.volume,
            captured_at: now,
          }));
          const { data: inserted } = await admin
            .from("price_snapshots")
            .insert(rows)
            .select("ticker, price, change_pct, captured_at");
          for (const r of inserted ?? []) {
            priceMap.set(r.ticker, {
              price: r.price,
              change_pct: r.change_pct,
              captured_at: r.captured_at,
            });
          }
        }
      } catch (e) {
        console.warn("ウォッチリスト株価フォールバック取得失敗:", e);
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">ウォッチリスト</h1>
        <AddTickerForm />
      </div>
      <WatchlistTable items={items} priceMap={priceMap} />
    </div>
  );
}
