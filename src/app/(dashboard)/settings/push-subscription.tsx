"use client";

import { useEffect, useState, useTransition } from "react";
import { Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  sendTestPush,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/features/push/actions";

type Status = "unsupported" | "denied" | "unsubscribed" | "subscribed";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function PushSubscription({
  publicKey,
}: {
  publicKey: string | null;
}) {
  const [status, setStatus] = useState<Status>("unsubscribed");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !publicKey
      ) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const existing = await reg.pushManager.getSubscription();
        if (cancelled) return;
        setStatus(existing ? "subscribed" : "unsubscribed");
      } catch {
        setStatus("unsupported");
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  const handleSubscribe = () => {
    if (!publicKey) {
      toast.error("VAPID 公開鍵が設定されていません");
      return;
    }
    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error("通知が許可されませんでした");
          setStatus(permission === "denied" ? "denied" : "unsubscribed");
          return;
        }
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });
        const json = sub.toJSON() as {
          endpoint?: string;
          keys?: { p256dh?: string; auth?: string };
        };
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
          toast.error("購読情報の取得に失敗しました");
          return;
        }
        const result = await subscribeToPush(
          {
            endpoint: json.endpoint,
            keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
          },
          navigator.userAgent
        );
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        setStatus("subscribed");
        toast.success("Web Push を有効にしました");
      } catch (error) {
        console.error("購読失敗:", error);
        toast.error("購読に失敗しました");
      }
    });
  };

  const handleTest = () => {
    startTransition(async () => {
      const result = await sendTestPush();
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("テスト通知を送信しました");
      }
    });
  };

  const handleUnsubscribe = () => {
    startTransition(async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await unsubscribeFromPush(sub.endpoint);
        }
        setStatus("unsubscribed");
        toast.success("Web Push を解除しました");
      } catch (error) {
        console.error("解除失敗:", error);
        toast.error("解除に失敗しました");
      }
    });
  };

  const label = (() => {
    switch (status) {
      case "subscribed":
        return { text: "有効", variant: "success" as const };
      case "denied":
        return { text: "拒否中", variant: "destructive" as const };
      case "unsupported":
        return { text: "未対応", variant: "outline" as const };
      default:
        return { text: "未設定", variant: "outline" as const };
    }
  })();

  const disabled = isPending || status === "unsupported" || !publicKey;

  return (
    <div className="flex items-center justify-between rounded-md border border-gray-100 p-3">
      <div className="flex items-center gap-3">
        <Smartphone className="h-4 w-4 text-gray-500" />
        <div>
          <p className="text-sm font-medium">Web Push</p>
          <p className="text-xs text-gray-400">
            {status === "denied"
              ? "ブラウザの通知設定で許可してください"
              : status === "unsupported"
                ? "このブラウザは未対応、または VAPID 鍵が未設定です"
                : status === "subscribed"
                  ? "このブラウザで通知を受け取ります"
                  : "このブラウザで通知を受け取れるようにします"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={label.variant}>{label.text}</Badge>
        {status === "subscribed" ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTest}
              disabled={isPending}
              className="text-xs"
            >
              テスト
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnsubscribe}
              disabled={isPending}
            >
              解除
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSubscribe}
            disabled={disabled}
          >
            有効にする
          </Button>
        )}
      </div>
    </div>
  );
}
