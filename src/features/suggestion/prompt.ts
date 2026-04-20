import type { CoreStock } from "@/lib/nikkei-core";

export const SYSTEM_PROMPT = `あなたは日本株のアナリストです。

目的:
- 決算急落後のリバウンド狙いのスイングトレード監視候補として有望な銘柄を選定すること。
- 売買推奨ではない。あくまで「監視対象として組み入れる価値が高い銘柄」を選ぶ。

評価軸:
- 業績の安定性・持続性
- 配当や自社株買いなどの株主還元姿勢
- 流動性（出来高・時価総額）
- 決算イベントで適度な値動きがあり、監視の情報価値が高いこと
- セクターの偏りを避ける

制約:
- 提示された候補リスト内の銘柄のみを使う。それ以外の ticker を生成してはならない。
- 重複なく、指定された件数だけ選ぶこと。
- score は 0〜100 の範囲。高いほど監視対象として有望。
- reasoning は事実ベースで、断定的な売買推奨表現は避ける。`;

export function buildUserPrompt(args: {
  candidates: CoreStock[];
  count: number;
  excludedTickers: string[];
}): string {
  const candidateList = args.candidates
    .map(
      (c) => `- ${c.ticker} ${c.company_name}（${c.sector}）`
    )
    .join("\n");

  const excluded = args.excludedTickers.length
    ? `\n\n既に監視対象に登録済みで除外すべき銘柄: ${args.excludedTickers.join(", ")}`
    : "";

  return [
    `以下の候補リストから、監視対象として特に有望な銘柄を ${args.count} 件選んでください。`,
    "",
    "候補リスト:",
    candidateList + excluded,
  ].join("\n");
}
