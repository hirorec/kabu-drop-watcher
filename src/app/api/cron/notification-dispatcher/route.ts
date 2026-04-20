import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import {
  DEFAULT_ALERT_RULE,
  shouldNotifyAnalysis,
  shouldNotifyPriceDrop,
  type AlertRule,
} from "@/features/notification/rules";
import {
  buildAnalysisNotification,
  buildPriceDropNotification,
} from "@/features/notification/build";
import { sendPushToUser } from "@/features/push/send";

function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const CRON_SECRET = process.env.CRON_SECRET;
// 直近の分析・急落のみを対象にする窓（ミリ秒）
const LOOKBACK_MS = 24 * 60 * 60 * 1000;
// 同一 user + ticker + type で連続通知を抑制する窓（ミリ秒）
const DEDUP_WINDOW_MS = 60 * 60 * 1000; // 1時間

type InsertNotification = Database["public"]["Tables"]["notifications"]["Insert"];

export async function GET(request: Request) {
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();
  const since = new Date(Date.now() - LOOKBACK_MS).toISOString();

  // 1. 全ユーザーのウォッチリストとアラートルールを取得
  const [{ data: watchlists }, { data: alertRules }] = await Promise.all([
    supabase
      .from("watchlists")
      .select("user_id, ticker, company_name, enabled")
      .eq("enabled", true),
    supabase
      .from("user_alert_rules")
      .select("user_id, min_drop_pct, min_score"),
  ]);

  if (!watchlists || watchlists.length === 0) {
    return NextResponse.json({
      message: "No active watchlists",
      inserted_count: 0,
    });
  }

  // user_id -> AlertRule
  const rulesByUser = new Map<string, AlertRule>();
  for (const r of alertRules ?? []) {
    rulesByUser.set(r.user_id, {
      min_drop_pct: r.min_drop_pct,
      min_score: r.min_score,
    });
  }

  // ticker -> [{user_id, company_name}]
  const watchersByTicker = new Map<
    string,
    { user_id: string; company_name: string | null }[]
  >();
  for (const w of watchlists) {
    const arr = watchersByTicker.get(w.ticker) ?? [];
    arr.push({ user_id: w.user_id, company_name: w.company_name });
    watchersByTicker.set(w.ticker, arr);
  }

  // 2. 直近の分析結果と急落スナップショット、既存通知を並列取得
  const tickers = Array.from(watchersByTicker.keys());
  const [
    { data: analyses },
    { data: drops },
    { data: existingNotifications },
  ] = await Promise.all([
    supabase
      .from("analysis_results")
      .select("id, ticker, summary, score, json_result, created_at")
      .in("ticker", tickers)
      .gte("created_at", since),
    supabase
      .from("price_snapshots")
      .select("id, ticker, price, change_pct, captured_at")
      .in("ticker", tickers)
      .lte("change_pct", 0)
      .gte("captured_at", since),
    supabase
      .from("notifications")
      .select("user_id, ticker, type, source_id, sent_at")
      .gte("sent_at", since),
  ]);

  // 既に通知済みの (user_id, type, source_id) セット
  const sentSources = new Set<string>();
  // (user_id, ticker, type) -> 直近 sent_at
  const lastSentByKey = new Map<string, number>();
  for (const n of existingNotifications ?? []) {
    if (n.source_id) {
      sentSources.add(`${n.user_id}|${n.type}|${n.source_id}`);
    }
    const key = `${n.user_id}|${n.ticker}|${n.type}`;
    const ts = new Date(n.sent_at).getTime();
    const prev = lastSentByKey.get(key) ?? 0;
    if (ts > prev) lastSentByKey.set(key, ts);
  }

  const toInsert: InsertNotification[] = [];
  const now = Date.now();

  // 3. AI 分析通知
  for (const a of analyses ?? []) {
    const watchers = watchersByTicker.get(a.ticker) ?? [];
    for (const w of watchers) {
      const rule = rulesByUser.get(w.user_id) ?? DEFAULT_ALERT_RULE;
      if (!shouldNotifyAnalysis(a.score, rule)) continue;

      const sourceKey = `${w.user_id}|disclosure_analysis|${a.id}`;
      if (sentSources.has(sourceKey)) continue;

      const lastKey = `${w.user_id}|${a.ticker}|disclosure_analysis`;
      const last = lastSentByKey.get(lastKey) ?? 0;
      if (now - last < DEDUP_WINDOW_MS) continue;

      const jsonResult = a.json_result as
        | { notification_body?: string }
        | null;
      const notification = buildAnalysisNotification({
        ticker: a.ticker,
        company_name: w.company_name,
        summary: a.summary,
        notification_body: jsonResult?.notification_body ?? null,
        score: a.score,
      });

      toInsert.push({
        user_id: w.user_id,
        ticker: a.ticker,
        type: "disclosure_analysis",
        source_id: a.id,
        title: notification.title,
        body: notification.body,
      });
      sentSources.add(sourceKey);
      lastSentByKey.set(lastKey, now);
    }
  }

  // 4. 急落通知
  for (const d of drops ?? []) {
    if (d.change_pct === null) continue;
    const watchers = watchersByTicker.get(d.ticker) ?? [];
    for (const w of watchers) {
      const rule = rulesByUser.get(w.user_id) ?? DEFAULT_ALERT_RULE;
      if (!shouldNotifyPriceDrop(d.change_pct, rule)) continue;

      const sourceKey = `${w.user_id}|price_drop|${d.id}`;
      if (sentSources.has(sourceKey)) continue;

      const lastKey = `${w.user_id}|${d.ticker}|price_drop`;
      const last = lastSentByKey.get(lastKey) ?? 0;
      if (now - last < DEDUP_WINDOW_MS) continue;

      const notification = buildPriceDropNotification({
        ticker: d.ticker,
        company_name: w.company_name,
        price: d.price,
        change_pct: d.change_pct,
      });

      toInsert.push({
        user_id: w.user_id,
        ticker: d.ticker,
        type: "price_drop",
        source_id: d.id,
        title: notification.title,
        body: notification.body,
      });
      sentSources.add(sourceKey);
      lastSentByKey.set(lastKey, now);
    }
  }

  if (toInsert.length === 0) {
    return NextResponse.json({
      message: "No notifications to send",
      inserted_count: 0,
    });
  }

  // 5. バッチ挿入（UNIQUE 制約で重複は DB 側でも弾かれる）
  const { data: inserted, error } = await supabase
    .from("notifications")
    .insert(toInsert)
    .select("id, user_id, ticker, type, title, body, source_id");

  if (error) {
    console.error("通知挿入エラー:", error);
    return NextResponse.json(
      { error: "Failed to insert notifications", detail: error.message },
      { status: 500 }
    );
  }

  // 6. Web Push 送信（失敗は各件ログのみ）
  let pushSent = 0;
  let pushRemoved = 0;
  await Promise.all(
    (inserted ?? []).map(async (n) => {
      const res = await sendPushToUser(n.user_id, {
        title: n.title,
        body: n.body ?? undefined,
        url: `/ticker/${n.ticker}`,
        tag: n.source_id ?? undefined,
      });
      pushSent += res.sent;
      pushRemoved += res.removed;
    })
  );

  console.log(
    `通知ジョブ: ${inserted?.length ?? 0}件挿入 / push ${pushSent}件 / 無効化 ${pushRemoved}件`
  );

  return NextResponse.json({
    message: "Notification dispatcher completed",
    inserted_count: inserted?.length ?? 0,
    push_sent: pushSent,
    push_removed: pushRemoved,
    inserted: inserted ?? [],
  });
}
