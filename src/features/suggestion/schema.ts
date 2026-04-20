import { z } from "zod";

// AI が返す候補銘柄の構造
export const suggestionItemSchema = z.object({
  ticker: z
    .string()
    .describe("候補から選んだ銘柄コード（4桁）。提示した候補リスト内の ticker のみ使用する"),
  reasoning: z
    .string()
    .describe("選定理由を日本語で1〜2文。業績・還元・構造・流動性など客観材料ベース"),
  score: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe("監視対象としての有望度 0-100"),
});

export const suggestionBatchSchema = z.object({
  suggestions: z
    .array(suggestionItemSchema)
    .describe("選定された候補銘柄の配列。重複禁止"),
});

export type SuggestionItem = z.infer<typeof suggestionItemSchema>;
export type SuggestionBatch = z.infer<typeof suggestionBatchSchema>;
