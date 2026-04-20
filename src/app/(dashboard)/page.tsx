import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, Eye, FileText, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 並列でデータ取得
  const [
    { data: watchlists },
    { data: drops },
    { data: recentSnapshots },
    { data: recentEvents },
  ] = await Promise.all([
    // ウォッチリスト件数
    supabase
      .from("watchlists")
      .select("id, ticker, company_name, enabled")
      .eq("user_id", user.id)
      .order("priority", { ascending: false }),
    // 当日の急落銘柄（-5%以下）
    supabase
      .from("price_snapshots")
      .select("ticker, price, change_pct, captured_at")
      .lte("change_pct", -5)
      .order("change_pct", { ascending: true })
      .limit(10),
    // 最新の株価スナップショット（ウォッチリスト銘柄）
    supabase
      .from("price_snapshots")
      .select("ticker, price, change_pct, captured_at")
      .order("captured_at", { ascending: false })
      .limit(20),
    // 最近の適時開示
    supabase
      .from("earnings_events")
      .select("id, ticker, announced_at, raw_text, period")
      .order("announced_at", { ascending: false })
      .limit(5),
  ]);

  // 最新スナップショットを銘柄ごとに1件に絞る
  const latestByTicker = new Map<string, typeof recentSnapshots extends (infer T)[] | null ? NonNullable<T> : never>();
  for (const snap of recentSnapshots ?? []) {
    if (!latestByTicker.has(snap.ticker)) {
      latestByTicker.set(snap.ticker, snap);
    }
  }

  // ウォッチリストの銘柄名マップ
  const tickerNameMap = new Map(
    (watchlists ?? []).map((w) => [w.ticker, w.company_name])
  );

  const enabledCount = (watchlists ?? []).filter((w) => w.enabled).length;
  const totalCount = (watchlists ?? []).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ダッシュボード</h1>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="監視銘柄"
          value={`${enabledCount} / ${totalCount}`}
          description="有効 / 全体"
          icon={<Eye className="h-4 w-4 text-gray-500" />}
        />
        <SummaryCard
          title="急落検知"
          value={String(drops?.length ?? 0)}
          description="件（-5%以下）"
          icon={<TrendingDown className="h-4 w-4 text-red-500" />}
        />
        <SummaryCard
          title="適時開示"
          value={String(recentEvents?.length ?? 0)}
          description="件（直近）"
          icon={<FileText className="h-4 w-4 text-blue-500" />}
        />
        <SummaryCard
          title="最終取得"
          value={
            recentSnapshots?.[0]
              ? formatDistanceToNow(new Date(recentSnapshots[0].captured_at), {
                  addSuffix: true,
                  locale: ja,
                })
              : "—"
          }
          description="株価データ"
          icon={<Activity className="h-4 w-4 text-green-500" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 急落銘柄 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              急落銘柄
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(drops?.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-500">急落銘柄はありません。</p>
            ) : (
              <div className="space-y-3">
                {drops!.map((drop, i) => (
                  <div
                    key={`${drop.ticker}-${i}`}
                    className="flex items-center justify-between rounded-md border border-gray-100 p-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">
                          {drop.ticker}
                        </span>
                        <span className="text-sm text-gray-500">
                          {tickerNameMap.get(drop.ticker) ?? ""}
                        </span>
                      </div>
                      <span className="text-sm text-gray-400">
                        ¥{Number(drop.price).toLocaleString()}
                      </span>
                    </div>
                    <Badge variant="destructive">
                      {Number(drop.change_pct).toFixed(2)}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 最新株価 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              最新株価
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latestByTicker.size === 0 ? (
              <p className="text-sm text-gray-500">
                株価データがまだありません。
              </p>
            ) : (
              <div className="space-y-3">
                {Array.from(latestByTicker.values()).map((snap) => (
                  <div
                    key={snap.ticker}
                    className="flex items-center justify-between rounded-md border border-gray-100 p-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">
                          {snap.ticker}
                        </span>
                        <span className="text-sm text-gray-500">
                          {tickerNameMap.get(snap.ticker) ?? ""}
                        </span>
                      </div>
                      <span className="text-sm text-gray-400">
                        ¥{Number(snap.price).toLocaleString()}
                      </span>
                    </div>
                    <Badge
                      variant={
                        Number(snap.change_pct) < 0 ? "destructive" : "success"
                      }
                    >
                      {Number(snap.change_pct) > 0 ? "+" : ""}
                      {Number(snap.change_pct).toFixed(2)}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 最近の適時開示 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              最近の適時開示
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(recentEvents?.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-500">
                適時開示はまだありません。
              </p>
            ) : (
              <div className="space-y-3">
                {recentEvents!.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start justify-between rounded-md border border-gray-100 p-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">
                          {event.ticker}
                        </span>
                        <span className="text-sm text-gray-500">
                          {tickerNameMap.get(event.ticker) ?? ""}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{event.raw_text}</p>
                      {event.period && (
                        <p className="text-xs text-gray-400">{event.period}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">
                      {formatDistanceToNow(new Date(event.announced_at), {
                        addSuffix: true,
                        locale: ja,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ウォッチリストへのリンク */}
      {totalCount === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8">
            <p className="text-sm text-gray-500">
              まずはウォッチリストに銘柄を追加しましょう。
            </p>
            <Link
              href="/watchlist"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              ウォッチリストへ
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">{title}</span>
          {icon}
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold">{value}</span>
          <span className="ml-2 text-sm text-gray-500">{description}</span>
        </div>
      </CardContent>
    </Card>
  );
}
