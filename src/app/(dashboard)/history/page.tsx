import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  REASON_LABELS,
  type AnalysisResult,
} from "@/features/analysis/schema";
import {
  CONFIDENCE_JA,
  GUIDANCE_STATUS_JA,
  KPI_STATUS_JA,
  REASON_LABEL_JA,
  STRUCTURAL_JA,
  labelOrRaw,
} from "@/features/analysis/labels";

type PageProps = {
  searchParams: Promise<{
    ticker?: string;
    reason?: string;
    days?: string;
  }>;
};

const DAYS_OPTIONS = [
  { value: "7", label: "直近7日" },
  { value: "30", label: "直近30日" },
  { value: "all", label: "全期間" },
] as const;

export default async function HistoryPage({ searchParams }: PageProps) {
  const { ticker, reason, days } = await searchParams;
  const activeDays =
    days === "7" || days === "all" ? days : "30";
  const activeReason = (REASON_LABELS as readonly string[]).includes(
    reason ?? ""
  )
    ? reason
    : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ユーザーのウォッチリスト銘柄に限定
  const { data: watchlists } = await supabase
    .from("watchlists")
    .select("ticker, company_name")
    .eq("user_id", user.id);

  const watchedTickers = (watchlists ?? []).map((w) => w.ticker);
  const tickerNameMap = new Map(
    (watchlists ?? []).map((w) => [w.ticker, w.company_name])
  );

  let query = supabase
    .from("analysis_results")
    .select(
      "id, ticker, summary, reason_label, structural_classification, kpi_status, guidance_status, score, json_result, created_at, event_id"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (watchedTickers.length > 0) {
    query = query.in("ticker", watchedTickers);
  } else {
    // ウォッチリスト空ならそのまま空配列を返すようにする
    query = query.in("ticker", ["__none__"]);
  }

  if (ticker) {
    query = query.eq("ticker", ticker);
  }
  if (activeReason) {
    query = query.eq("reason_label", activeReason);
  }
  if (activeDays !== "all") {
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const since = new Date(
      now - Number(activeDays) * 24 * 60 * 60 * 1000
    ).toISOString();
    query = query.gte("created_at", since);
  }

  const { data: analyses } = await query;

  // 関連 earnings_events を一括取得
  const eventIds = (analyses ?? [])
    .map((a) => a.event_id)
    .filter((id): id is string => !!id);

  const { data: events } = eventIds.length
    ? await supabase
        .from("earnings_events")
        .select("id, raw_text, announced_at, period")
        .in("id", eventIds)
    : { data: [] };

  const eventById = new Map((events ?? []).map((e) => [e.id, e]));

  const buildFilterHref = (patch: {
    ticker?: string | null;
    reason?: string | null;
    days?: string;
  }) => {
    const params = new URLSearchParams();
    const nextTicker = patch.ticker === null ? undefined : patch.ticker ?? ticker;
    const nextReason = patch.reason === null ? undefined : patch.reason ?? activeReason;
    const nextDays = patch.days ?? activeDays;
    if (nextTicker) params.set("ticker", nextTicker);
    if (nextReason) params.set("reason", nextReason);
    if (nextDays !== "30") params.set("days", nextDays);
    const qs = params.toString();
    return qs ? `/history?${qs}` : "/history";
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">分析履歴</h1>

      {/* 絞り込み */}
      <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
        {/* 期間 */}
        <div>
          <p className="mb-2 text-xs font-medium text-gray-500">期間</p>
          <div className="flex flex-wrap gap-2">
            {DAYS_OPTIONS.map((opt) => (
              <Link
                key={opt.value}
                href={buildFilterHref({ days: opt.value })}
                className={`rounded-full border px-3 py-1 text-sm ${
                  activeDays === opt.value
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>
        </div>

        {/* 銘柄 */}
        {watchedTickers.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-gray-500">銘柄</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildFilterHref({ ticker: null })}
                className={`rounded-full border px-3 py-1 text-sm ${
                  !ticker
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                }`}
              >
                すべて
              </Link>
              {watchedTickers.map((t) => (
                <Link
                  key={t}
                  href={buildFilterHref({ ticker: t })}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    ticker === t
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span className="font-mono">{t}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* reason label */}
        <div>
          <p className="mb-2 text-xs font-medium text-gray-500">急落理由</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildFilterHref({ reason: null })}
              className={`rounded-full border px-3 py-1 text-sm ${
                !activeReason
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              すべて
            </Link>
            {REASON_LABELS.map((r) => (
              <Link
                key={r}
                href={buildFilterHref({ reason: r })}
                className={`rounded-full border px-3 py-1 text-sm ${
                  activeReason === r
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                }`}
              >
                {REASON_LABEL_JA[r] ?? r}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* 一覧 */}
      {(analyses?.length ?? 0) === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center md:p-12">
          <p className="text-sm text-gray-500">該当する分析結果はありません。</p>
          {watchedTickers.length === 0 && (
            <p className="mt-2 text-sm text-gray-400">
              まずは{" "}
              <Link href="/watchlist" className="underline">
                ウォッチリスト
              </Link>
              に銘柄を登録してください。
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {analyses!.map((a) => {
            const json = (a.json_result ?? {}) as Partial<AnalysisResult>;
            const event = a.event_id ? eventById.get(a.event_id) : undefined;
            return (
              <div
                key={a.id}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/ticker/${a.ticker}`}
                    className="font-mono text-sm font-medium hover:underline"
                  >
                    {a.ticker}
                  </Link>
                  <span className="text-sm text-gray-500">
                    {tickerNameMap.get(a.ticker) ?? ""}
                  </span>
                  <Badge variant="default">スコア {a.score ?? "—"}</Badge>
                  <Badge variant="outline">
                    {labelOrRaw(REASON_LABEL_JA, a.reason_label)}
                  </Badge>
                  <Badge variant="outline">
                    {labelOrRaw(STRUCTURAL_JA, a.structural_classification)}
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
                  <p className="mb-2 text-sm text-gray-700">{a.summary}</p>
                )}
                {event && (
                  <div className="mt-3 rounded-md border border-gray-100 bg-gray-50 p-3 text-xs text-gray-500">
                    <p className="font-medium text-gray-600">元開示</p>
                    <p className="mt-1">{event.raw_text}</p>
                    {event.period && (
                      <p className="mt-1 text-gray-400">{event.period}</p>
                    )}
                  </div>
                )}
                <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
                  <div className="flex justify-between sm:block">
                    <dt className="text-gray-400">通期見通し</dt>
                    <dd className="font-medium">
                      {labelOrRaw(GUIDANCE_STATUS_JA, a.guidance_status)}
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
                        { positive: "還元材料あり", none: "なし", unclear: "不明" },
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
    </div>
  );
}
