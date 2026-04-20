import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_ALERT_RULE } from "@/features/notification/rules";
import { SettingsForm } from "./settings-form";
import { PushSubscription } from "./push-subscription";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: rule } = await supabase
    .from("user_alert_rules")
    .select("min_drop_pct, min_score, channels")
    .eq("user_id", user.id)
    .maybeSingle();

  const minDropPct = rule?.min_drop_pct ?? DEFAULT_ALERT_RULE.min_drop_pct;
  const minScore = rule?.min_score ?? DEFAULT_ALERT_RULE.min_score;
  const channels = (rule?.channels ?? {}) as { email?: boolean };
  const emailEnabled = channels.email === true;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">設定</h1>

      {/* アラートルール */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-500" />
            アラートルール
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm
            initialMinDropPct={minDropPct}
            initialMinScore={minScore}
            initialEmailEnabled={emailEnabled}
          />
          {!rule && (
            <p className="mt-4 text-xs text-gray-400">
              まだ保存されていません。上記はデフォルト値です。
            </p>
          )}
        </CardContent>
      </Card>

      {/* 通知チャネル（今後追加予定） */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            通知チャネル
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-md border border-gray-100 p-3">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium">アプリ内通知</p>
                <p className="text-xs text-gray-400">
                  通知履歴ページで確認できます
                </p>
              </div>
            </div>
            <Badge variant="success">有効</Badge>
          </div>
          <PushSubscription
            publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
