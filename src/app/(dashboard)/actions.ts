"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type AddSuggestionResult =
  | { success: true }
  | { error: string };

export async function addSuggestedTicker(
  ticker: string,
  companyName: string
): Promise<AddSuggestionResult> {
  if (!ticker || !companyName) {
    return { error: "銘柄情報が不正です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です" };
  }

  const { error } = await supabase.from("watchlists").insert({
    user_id: user.id,
    ticker,
    company_name: companyName,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "既に登録済みです" };
    }
    return { error: "追加に失敗しました" };
  }

  revalidatePath("/");
  revalidatePath("/watchlist");
  return { success: true };
}
