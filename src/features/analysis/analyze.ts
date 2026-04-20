import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { analysisResultSchema, type AnalysisResult } from "./schema";
import {
  buildManualUserPrompt,
  buildUserPrompt,
  SYSTEM_PROMPT,
  type AnalysisInput,
  type ManualAnalysisInput,
} from "./prompt";

const MODEL_ID = "gpt-4o-mini";

// 適時開示イベントを AI 分析し、構造化された結果を返す
export async function analyzeDisclosure(
  input: AnalysisInput
): Promise<AnalysisResult> {
  const { output } = await generateText({
    model: openai.responses(MODEL_ID),
    system: SYSTEM_PROMPT,
    prompt: buildUserPrompt(input),
    output: Output.object({ schema: analysisResultSchema }),
  });

  return output;
}

// ユーザーが銘柄詳細ページから手動で実行する分析（最新開示 + 株価動向）
export async function analyzeTickerManually(
  input: ManualAnalysisInput
): Promise<AnalysisResult> {
  const { output } = await generateText({
    model: openai.responses(MODEL_ID),
    system: SYSTEM_PROMPT,
    prompt: buildManualUserPrompt(input),
    output: Output.object({ schema: analysisResultSchema }),
  });

  return output;
}
