"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function markAsRead(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です" };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ opened_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("opened_at", null);

  if (error) {
    return { error: "更新に失敗しました" };
  }

  revalidatePath("/notifications");
  return { success: true };
}

export async function markAllAsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証が必要です" };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ opened_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("opened_at", null);

  if (error) {
    return { error: "更新に失敗しました" };
  }

  revalidatePath("/notifications");
  return { success: true };
}
