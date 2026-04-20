import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !subject) return false;
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
};

// 指定ユーザーの全購読に Push を送信する
// エンドポイントが失効 (404 / 410) の場合は DB から削除
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; removed: number }> {
  if (!ensureConfigured()) {
    return { sent: 0, removed: 0 };
  }

  const admin = createAdminClient();
  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error || !subs || subs.length === 0) {
    return { sent: 0, removed: 0 };
  }

  let sent = 0;
  let removed = 0;
  const removeIds: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          JSON.stringify(payload)
        );
        sent++;
      } catch (err: unknown) {
        const statusCode =
          typeof err === "object" && err !== null && "statusCode" in err
            ? (err as { statusCode: number }).statusCode
            : 0;
        if (statusCode === 404 || statusCode === 410) {
          removeIds.push(s.id);
        } else {
          console.warn("push 送信失敗:", err);
        }
      }
    })
  );

  if (removeIds.length > 0) {
    const { error: delError } = await admin
      .from("push_subscriptions")
      .delete()
      .in("id", removeIds);
    if (!delError) removed = removeIds.length;
  }

  return { sent, removed };
}
