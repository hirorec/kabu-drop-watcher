import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotificationItem } from "./notification-item";
import { MarkAllReadButton } from "./mark-all-read-button";

type PageProps = {
  searchParams: Promise<{ type?: string }>;
};

const TYPE_FILTERS = [
  { key: "all", label: "すべて" },
  { key: "disclosure_analysis", label: "分析" },
  { key: "price_drop", label: "急落" },
] as const;

export default async function NotificationsPage({ searchParams }: PageProps) {
  const { type } = await searchParams;
  const activeFilter =
    type === "disclosure_analysis" || type === "price_drop" ? type : "all";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let query = supabase
    .from("notifications")
    .select("id, ticker, type, title, body, sent_at, opened_at")
    .eq("user_id", user.id)
    .order("sent_at", { ascending: false })
    .limit(100);

  if (activeFilter !== "all") {
    query = query.eq("type", activeFilter);
  }

  const { data: items } = await query;
  const unreadCount = (items ?? []).filter((n) => !n.opened_at).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">通知履歴</h1>
          {unreadCount > 0 && (
            <p className="mt-1 text-sm text-gray-500">未読 {unreadCount} 件</p>
          )}
        </div>
        <MarkAllReadButton disabled={unreadCount === 0} />
      </div>

      {/* type フィルタ */}
      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((f) => {
          const isActive = activeFilter === f.key;
          const href = f.key === "all" ? "/notifications" : `/notifications?type=${f.key}`;
          return (
            <Link
              key={f.key}
              href={href}
              className={`rounded-full border px-3 py-1 text-sm ${
                isActive
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {/* 通知一覧 */}
      {(items?.length ?? 0) === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center md:p-12">
          <p className="text-sm text-gray-500">通知はまだありません。</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items!.map((item) => (
            <NotificationItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
