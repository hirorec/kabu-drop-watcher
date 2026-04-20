"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addTicker(formData: FormData) {
  const ticker = (formData.get("ticker") as string)?.trim().toUpperCase();
  const companyName = (formData.get("companyName") as string)?.trim();
  const memo = (formData.get("memo") as string)?.trim() || null;

  if (!ticker || !companyName) {
    return { error: "銘柄コードと企業名は必須です" };
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
    memo,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "この銘柄は既に登録されています" };
    }
    return { error: "追加に失敗しました" };
  }

  revalidatePath("/watchlist");
  return { success: true };
}

export async function removeTicker(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("watchlists").delete().eq("id", id);

  if (error) {
    return { error: "削除に失敗しました" };
  }

  revalidatePath("/watchlist");
  return { success: true };
}

export async function toggleTicker(id: string, enabled: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("watchlists")
    .update({ enabled })
    .eq("id", id);

  if (error) {
    return { error: "更新に失敗しました" };
  }

  revalidatePath("/watchlist");
  return { success: true };
}
