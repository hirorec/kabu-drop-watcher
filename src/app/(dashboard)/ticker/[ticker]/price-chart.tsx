"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import {
  CandlestickSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
} from "lightweight-charts";
import type { ChartRange, DailyOhlc } from "@/lib/stock";

const RANGES: { value: ChartRange; label: string }[] = [
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
  { value: "6M", label: "6M" },
  { value: "1Y", label: "1Y" },
];

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch chart data");
  return res.json() as Promise<{ data: DailyOhlc[] }>;
};

export function PriceChart({ ticker }: { ticker: string }) {
  const [range, setRange] = useState<ChartRange>("3M");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const { data, error, isLoading } = useSWR(
    `/api/stock/history?ticker=${encodeURIComponent(ticker)}&range=${range}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // チャート初期化（初回のみ）
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { color: "transparent" },
        textColor: "#4b5563",
      },
      grid: {
        vertLines: { color: "#f3f4f6" },
        horzLines: { color: "#f3f4f6" },
      },
      rightPriceScale: { borderColor: "#e5e7eb" },
      timeScale: { borderColor: "#e5e7eb" },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#16a34a",
      downColor: "#dc2626",
      borderUpColor: "#16a34a",
      borderDownColor: "#dc2626",
      wickUpColor: "#16a34a",
      wickDownColor: "#dc2626",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // データ変更時にシリーズを更新
  useEffect(() => {
    if (!seriesRef.current || !data?.data) return;
    const candles: CandlestickData[] = data.data.map((d) => ({
      time: d.time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
    seriesRef.current.setData(candles);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-md border border-gray-200 p-0.5">
          {RANGES.map((r) => {
            const isActive = range === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setRange(r.value)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
        {isLoading && (
          <span className="text-xs text-gray-400">読み込み中...</span>
        )}
      </div>
      <div
        ref={containerRef}
        className="h-80 w-full rounded-md border border-gray-100 bg-white"
      />
      {error && (
        <p className="text-xs text-red-600">
          チャートデータの取得に失敗しました。
        </p>
      )}
      {!isLoading && !error && (data?.data?.length ?? 0) === 0 && (
        <p className="text-xs text-gray-400">データがありません。</p>
      )}
    </div>
  );
}
