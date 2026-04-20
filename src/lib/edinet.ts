import { format } from "date-fns";

const EDINET_BASE_URL = "https://api.edinet-fsa.go.jp/api/v2";

// 決算短信に該当する docTypeCode
const EARNINGS_DOC_TYPES = new Set([
  "140", // 四半期決算短信
  "150", // 決算短信
]);

export interface EdinetDocument {
  docID: string;
  secCode: string | null; // 証券コード（4桁 + チェックディジット）
  edinetCode: string;
  filerName: string;
  docDescription: string;
  docTypeCode: string;
  submitDateTime: string;
  periodStart: string | null;
  periodEnd: string | null;
}

interface EdinetApiResponse {
  metadata: {
    title: string;
    parameter: {
      date: string;
      type: string;
    };
    resultset: {
      count: number;
    };
    processDateTime: string;
    status: string;
    message: string;
  };
  results: Array<{
    docID: string;
    secCode: string | null;
    edinetCode: string;
    filerName: string;
    docDescription: string;
    docTypeCode: string;
    submitDateTime: string;
    periodStart: string | null;
    periodEnd: string | null;
    [key: string]: unknown;
  }>;
}

/**
 * 指定日の EDINET 提出書類一覧を取得する
 */
async function fetchDocumentList(date: Date): Promise<EdinetApiResponse> {
  const apiKey = process.env.EDINET_API_KEY;
  if (!apiKey) {
    throw new Error("EDINET_API_KEY が設定されていません");
  }

  const dateStr = format(date, "yyyy-MM-dd");
  const url = `${EDINET_BASE_URL}/documents.json?date=${dateStr}&type=2&Subscription-Key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`EDINET API エラー: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * 指定日の決算短信を取得する
 * ウォッチリストの証券コードでフィルタリングする
 */
export async function fetchEarningsDisclosures(
  date: Date,
  watchedSecCodes: Set<string>
): Promise<EdinetDocument[]> {
  const data = await fetchDocumentList(date);

  if (!data.results) return [];

  return data.results
    .filter((doc) => {
      // 決算短信のみ
      if (!EARNINGS_DOC_TYPES.has(doc.docTypeCode)) return false;
      // ウォッチリストの銘柄のみ（secCode は5桁なので先頭4桁で比較）
      if (!doc.secCode) return false;
      const ticker = doc.secCode.slice(0, 4);
      return watchedSecCodes.has(ticker);
    })
    .map((doc) => ({
      docID: doc.docID,
      secCode: doc.secCode,
      edinetCode: doc.edinetCode,
      filerName: doc.filerName,
      docDescription: doc.docDescription,
      docTypeCode: doc.docTypeCode,
      submitDateTime: doc.submitDateTime,
      periodStart: doc.periodStart,
      periodEnd: doc.periodEnd,
    }));
}

/**
 * 証券コード（4桁）を EDINET の secCode 比較用に変換
 * EDINET の secCode は5桁（4桁 + チェックディジット0）
 */
export function tickerToSecCode(ticker: string): string {
  return ticker.slice(0, 4);
}
