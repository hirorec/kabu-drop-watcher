"use server";

import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "./send";

export type PushSubscriptionInput = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type PushActionResult = { success: true } | { error: string };

export async function subscribeToPush(
  subscription: PushSubscriptionInput,
  userAgent?: string
): Promise<PushActionResult> {
  if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return { error: "不正な購読情報です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: userAgent ?? null,
    },
    { onConflict: "user_id,endpoint" }
  );

  if (error) {
    return { error: "購読の登録に失敗しました" };
  }

  return { success: true };
}

export async function sendTestPush(): Promise<PushActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "認証が必要です" };

  const result = await sendPushToUser(user.id, {
    title: "テスト通知",
    body: "Web Push の疎通確認です。クリックするとダッシュボードに移動します。",
    url: "/",
    tag: "test-push",
  });

  if (result.sent === 0) {
    return { error: "送信先がないか、VAPID 鍵が未設定です" };
  }

  return { success: true };
}

export async function unsubscribeFromPush(
  endpoint: string
): Promise<PushActionResult> {
  if (!endpoint) return { error: "endpoint が指定されていません" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (error) {
    return { error: "解除に失敗しました" };
  }

  return { success: true };
}
