import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { NIKKEI_CORE_STOCKS, type CoreStock } from "@/lib/nikkei-core";
import { suggestionBatchSchema, type SuggestionBatch } from "./schema";
import { buildUserPrompt, SYSTEM_PROMPT } from "./prompt";

const MODEL_ID = "gpt-4o-mini";

// AI に候補銘柄を選定させる
export async function selectSuggestions(args: {
  count: number;
  // 既に登録済みで除外したい銘柄
  excludedTickers?: string[];
}): Promise<SuggestionBatch> {
  const candidates = NIKKEI_CORE_STOCKS;
  const excluded = args.excludedTickers ?? [];

  const { output } = await generateText({
    model: openai.responses(MODEL_ID),
    system: SYSTEM_PROMPT,
    prompt: buildUserPrompt({
      candidates,
      count: args.count,
      excludedTickers: excluded,
    }),
    output: Output.object({ schema: suggestionBatchSchema }),
  });

  // 候補リスト外の ticker を弾く（ハルシネーション防止）
  const validTickers = new Set(candidates.map((c) => c.ticker));
  const filtered = output.suggestions.filter((s) =>
    validTickers.has(s.ticker)
  );

  return { suggestions: filtered };
}

// ticker から company_name を解決
export function resolveCompanyName(ticker: string): string | null {
  const stock: CoreStock | undefined = NIKKEI_CORE_STOCKS.find(
    (c) => c.ticker === ticker
  );
  return stock?.company_name ?? null;
}
