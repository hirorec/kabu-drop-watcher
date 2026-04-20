import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchDailyOhlc, type ChartRange, type DailyOhlc } from "@/lib/stock";

const ALLOWED_RANGES: ChartRange[] = ["1M", "3M", "6M", "1Y"];

export async function GET(request: Request) {
  // 認証チェック（ウォッチリストに登録済みの銘柄のみ取得可能）
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const ticker = url.searchParams.get("ticker")?.trim();
  const rangeParam = url.searchParams.get("range") as ChartRange | null;

  if (!ticker) {
    return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  }

  const range: ChartRange =
    rangeParam && ALLOWED_RANGES.includes(rangeParam) ? rangeParam : "3M";

  // ユーザーのウォッチリストに含まれているか
  const { data: watchItem } = await supabase
    .from("watchlists")
    .select("id")
    .eq("user_id", user.id)
    .eq("ticker", ticker)
    .maybeSingle();

  if (!watchItem) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let data: DailyOhlc[];
  try {
    data = await fetchDailyOhlc(ticker, range);
  } catch (error) {
    console.error("日足取得エラー:", error);
    return NextResponse.json(
      { error: "Failed to fetch chart data" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ticker, range, data });
}
