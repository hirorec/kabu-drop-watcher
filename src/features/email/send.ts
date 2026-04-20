import { Resend } from "resend";

let client: Resend | null = null;

function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

// Resend でメール送信。失敗時は false を返してログのみ。
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const resend = getClient();
  if (!resend) {
    return false;
  }

  const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

  const result = await resend.emails.send({
    from,
    to: [payload.to],
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });

  if (result.error) {
    console.warn("メール送信失敗:", result.error.message);
    return false;
  }
  return true;
}

// 通知用のシンプルな HTML 本文を生成
export function buildNotificationHtml(args: {
  title: string;
  body: string;
  url: string;
}): string {
  const safeTitle = escapeHtml(args.title);
  const safeBody = escapeHtml(args.body);
  const safeUrl = escapeHtml(args.url);
  return `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;max-width:560px;margin:0 auto;padding:20px;">
  <h2 style="margin:0 0 12px;font-size:18px;">${safeTitle}</h2>
  <p style="margin:0 0 16px;line-height:1.6;white-space:pre-wrap;">${safeBody}</p>
  <p style="margin:0;">
    <a href="${safeUrl}" style="display:inline-block;padding:8px 14px;background:#111;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;">詳細を見る</a>
  </p>
  <hr style="margin:24px 0;border:none;border-top:1px solid #eee;"/>
  <p style="font-size:12px;color:#888;margin:0;">kabu-drop-watcher — 通知設定は <a href="${safeUrl.replace(/\/ticker\/.*$/, "")}/settings" style="color:#888;">設定ページ</a> から変更できます。</p>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
