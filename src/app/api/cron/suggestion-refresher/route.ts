import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import {
  selectSuggestions,
  resolveCompanyName,
} from "@/features/suggestion/select";

function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const CRON_SECRET = process.env.CRON_SECRET;
const SUGGESTION_COUNT = 10;

export async function GET(request: Request) {
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const supabase = createAdminClient();

  let batch;
  try {
    batch = await selectSuggestions({ count: SUGGESTION_COUNT });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("候補選定失敗:", message);
    return NextResponse.json(
      { error: "Failed to generate suggestions", detail: message },
      { status: 500 }
    );
  }

  if (batch.suggestions.length === 0) {
    return NextResponse.json({
      message: "No suggestions generated",
      count: 0,
    });
  }

  const batchId = randomUUID();
  const rows = batch.suggestions.map((s) => ({
    ticker: s.ticker,
    company_name: resolveCompanyName(s.ticker) ?? s.ticker,
    reasoning: s.reasoning,
    score: s.score,
    batch_id: batchId,
  }));

  const { error: insertError } = await supabase
    .from("watchlist_suggestions")
    .insert(rows);

  if (insertError) {
    console.error("候補保存エラー:", insertError);
    return NextResponse.json(
      { error: "Failed to save suggestions", detail: insertError.message },
      { status: 500 }
    );
  }

  console.log(
    `候補更新: ${rows.length}件 batch_id=${batchId}`
  );

  return NextResponse.json({
    message: "Suggestion refresher completed",
    batch_id: batchId,
    count: rows.length,
    suggestions: rows,
  });
}
