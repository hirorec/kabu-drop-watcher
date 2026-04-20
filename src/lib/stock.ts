import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export interface StockQuote {
  ticker: string;
  price: number;
  changePct: number;
  volume: number;
  marketState: string;
}

/**
 * ウォッチリストの銘柄の株価を一括取得する
 * 日本株のティッカーには ".T" を付与する（例: 7974 → 7974.T）
 */
export async function fetchQuotes(tickers: string[]): Promise<StockQuote[]> {
  if (tickers.length === 0) return [];

  // 日本株のティッカー形式に変換
  const yahooSymbols = tickers.map((t) => toYahooSymbol(t));

  const quotes = await yahooFinance.quote(yahooSymbols, {
    fields: [
      "symbol",
      "regularMarketPrice",
      "regularMarketChangePercent",
      "regularMarketVolume",
      "marketState",
    ],
  });

  const results: StockQuote[] = [];
  const quoteArray = Array.isArray(quotes) ? quotes : [quotes];

  for (const q of quoteArray) {
    if (!q.symbol || q.regularMarketPrice == null) continue;

    results.push({
      ticker: fromYahooSymbol(q.symbol),
      price: q.regularMarketPrice,
      changePct: q.regularMarketChangePercent ?? 0,
      volume: q.regularMarketVolume ?? 0,
      marketState: q.marketState ?? "CLOSED",
    });
  }

  return results;
}

export type ChartRange = "1M" | "3M" | "6M" | "1Y";

export type DailyOhlc = {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

/**
 * 指定銘柄の日足 OHLC を取得する
 */
export async function fetchDailyOhlc(
  ticker: string,
  range: ChartRange
): Promise<DailyOhlc[]> {
  const symbol = toYahooSymbol(ticker);
  const period2 = new Date();
  const period1 = new Date();
  switch (range) {
    case "1M":
      period1.setMonth(period1.getMonth() - 1);
      break;
    case "3M":
      period1.setMonth(period1.getMonth() - 3);
      break;
    case "6M":
      period1.setMonth(period1.getMonth() - 6);
      break;
    case "1Y":
      period1.setFullYear(period1.getFullYear() - 1);
      break;
  }

  const result = await yahooFinance.chart(symbol, {
    period1,
    period2,
    interval: "1d",
  });

  const quotes = result.quotes ?? [];
  const ohlc: DailyOhlc[] = [];
  for (const q of quotes) {
    if (
      q.open == null ||
      q.high == null ||
      q.low == null ||
      q.close == null ||
      !q.date
    ) {
      continue;
    }
    ohlc.push({
      time: new Date(q.date).toISOString().split("T")[0],
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume ?? 0,
    });
  }
  return ohlc;
}

/**
 * 内部ティッカー（例: 7974）を Yahoo Finance 形式（例: 7974.T）に変換
 */
function toYahooSymbol(ticker: string): string {
  // 既に .T が付いている場合はそのまま
  if (ticker.endsWith(".T")) return ticker;
  // 数字のみの場合は東証銘柄とみなして .T を付与
  if (/^\d+$/.test(ticker)) return `${ticker}.T`;
  return ticker;
}

/**
 * Yahoo Finance 形式（例: 7974.T）を内部ティッカー（例: 7974）に戻す
 */
function fromYahooSymbol(symbol: string): string {
  return symbol.replace(/\.T$/, "");
}
