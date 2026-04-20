import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { ArrowLeft, TrendingDown, Activity, FileText, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PriceChart } from "./price-chart";
import {
  CONFIDENCE_JA,
  GUIDANCE_STATUS_JA,
  KPI_STATUS_JA,
  REASON_LABEL_JA,
  SHAREHOLDER_RETURN_JA,
  STRUCTURAL_JA,
  labelOrRaw,
} from "@/features/analysis/labels";

type PageProps = {
  params: Promise<{ ticker: string }>;
};

export default async function TickerDetailPage({ params }: PageProps) {
  const { ticker } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ウォッチリストに登録されているか確認
  const { data: watchItem } = await supabase
    .from("watchlists")
    .select("id, ticker, company_name, memo, priority, enabled")
    .eq("ticker", ticker)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!watchItem) {
    notFound();
  }

  // 関連データを並列取得
  const [
    { data: snapshots },
    { data: analyses },
    { data: events },
    { data: notifications },
  ] = await Promise.all([
    supabase
      .from("price_snapshots")
      .select("price, change_pct, volume, captured_at")
      .eq("ticker", ticker)
      .order("captured_at", { ascending: false })
      .limit(10),
    supabase
      .from("analysis_results")
      .select(
        "id, summary, reason_label, structural_classification, kpi_status, guidance_status, score, json_result, created_at, event_id"
      )
      .eq("ticker", ticker)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("earnings_events")
      .select("id, period, raw_text, announced_at, source_url")
      .eq("ticker", ticker)
      .order("announced_at", { ascending: false })
      .limit(5),
    supabase
      .from("notifications")
      .select("id, type, title, body, sent_at")
      .eq("ticker", ticker)
      .eq("user_id", user.id)
      .order("sent_at", { ascending: false })
      .limit(5),
  ]);

  const latest = snapshots?.[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/watchlist"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          ウォッチリストへ戻る
        </Link>
      </div>

      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="font-mono text-2xl font-bold">{watchItem.ticker}</h1>
        <span className="text-lg text-gray-700">{watchItem.company_name}</span>
        {!watchItem.enabled && <Badge variant="outline">監視停止中</Badge>}
      </div>

      {watchItem.memo && (
        <p className="text-sm text-gray-500">{watchItem.memo}</p>
      )}

      {/* 最新株価 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-500" />
            最新株価
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!latest ? (
            <p className="text-sm text-gray-500">株価データがまだありません。</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold">
                  ¥{Number(latest.price).toLocaleString()}
                </span>
                {latest.change_pct !== null && (
                  <Badge
                    variant={
                      Number(latest.change_pct) < 0 ? "destructive" : "success"
                    }
                  >
                    {Number(latest.change_pct) > 0 ? "+" : ""}
                    {Number(latest.change_pct).toFixed(2)}%
                  </Badge>
                )}
                <span className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(latest.captured_at), {
                    addSuffix: true,
                    locale: ja,
                  })}
                </span>
              </div>
              {snapshots && snapshots.length > 1 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-gray-500">
                    直近の推移
                  </p>
                  <div className="space-y-1">
                    {snapshots.slice(1).map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-gray-400">
                          {formatDistanceToNow(new Date(s.captured_at), {
                            addSuffix: true,
                            locale: ja,
                          })}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">
                            ¥{Number(s.price).toLocaleString()}
                          </span>
                          {s.change_pct !== null && (
                            <span
                              className={
                                Number(s.change_pct) < 0
                                  ? "text-red-600"
                                  : "text-gray-600"
                              }
                            >
                              {Number(s.change_pct) > 0 ? "+" : ""}
                              {Number(s.change_pct).toFixed(2)}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 日足チャート */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-500" />
            日足チャート
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PriceChart ticker={watchItem.ticker} />
        </CardContent>
      </Card>

      {/* AI 分析結果 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-blue-500" />
            AI 分析結果
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(analyses?.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-500">
              まだ分析結果がありません。
            </p>
          ) : (
            <div className="space-y-4">
              {analyses!.map((a) => {
                const json = (a.json_result ?? {}) as {
                  confidence?: string;
                  shareholder_return_signal?: string;
                };
                return (
                  <div
                    key={a.id}
                    className="rounded-md border border-gray-100 p-4"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="default">
                        スコア {a.score ?? "—"}
                      </Badge>
                      <Badge variant="outline">
                        {labelOrRaw(REASON_LABEL_JA, a.reason_label)}
                      </Badge>
                      <Badge variant="outline">
                        {labelOrRaw(
                          STRUCTURAL_JA,
                          a.structural_classification
                        )}
                      </Badge>
                      {json.confidence && (
                        <span className="text-xs text-gray-400">
                          確信度: {labelOrRaw(CONFIDENCE_JA, json.confidence)}
                        </span>
                      )}
                      <span className="ml-auto text-xs text-gray-400">
                        {formatDistanceToNow(new Date(a.created_at), {
                          addSuffix: true,
                          locale: ja,
                        })}
                      </span>
                    </div>
                    {a.summary && (
                      <p className="text-sm text-gray-700">{a.summary}</p>
                    )}
                    <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
                      <div className="flex justify-between sm:block">
                        <dt className="text-gray-400">通期見通し</dt>
                        <dd className="font-medium">
                          {labelOrRaw(
                            GUIDANCE_STATUS_JA,
                            a.guidance_status
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between sm:block">
                        <dt className="text-gray-400">KPI</dt>
                        <dd className="font-medium">
                          {labelOrRaw(KPI_STATUS_JA, a.kpi_status)}
                        </dd>
                      </div>
                      <div className="flex justify-between sm:block">
                        <dt className="text-gray-400">株主還元</dt>
                        <dd className="font-medium">
                          {labelOrRaw(
                            SHAREHOLDER_RETURN_JA,
                            json.shareholder_return_signal
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 適時開示 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-500" />
            適時開示
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(events?.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-500">適時開示がまだありません。</p>
          ) : (
            <div className="space-y-3">
              {events!.map((e) => (
                <div
                  key={e.id}
                  className="rounded-md border border-gray-100 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-700">{e.raw_text}</p>
                      {e.period && (
                        <p className="text-xs text-gray-400">{e.period}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">
                      {formatDistanceToNow(new Date(e.announced_at), {
                        addSuffix: true,
                        locale: ja,
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 通知履歴 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-500" />
            通知履歴
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(notifications?.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-500">通知履歴はありません。</p>
          ) : (
            <div className="space-y-3">
              {notifications!.map((n) => (
                <div
                  key={n.id}
                  className="rounded-md border border-gray-100 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.body && (
                        <p className="text-sm text-gray-600">{n.body}</p>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {n.type === "disclosure_analysis"
                          ? "分析"
                          : n.type === "price_drop"
                            ? "急落"
                            : n.type}
                      </Badge>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">
                      {formatDistanceToNow(new Date(n.sent_at), {
                        addSuffix: true,
                        locale: ja,
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
