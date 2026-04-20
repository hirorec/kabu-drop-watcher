import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { analysisResultSchema, type AnalysisResult } from "./schema";
import { buildUserPrompt, SYSTEM_PROMPT, type AnalysisInput } from "./prompt";

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
