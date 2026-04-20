"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  List,
  Clock,
  Bell,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/watchlist", label: "ウォッチリスト", icon: List },
  { href: "/history", label: "分析履歴", icon: Clock },
  { href: "/notifications", label: "通知履歴", icon: Bell },
  { href: "/settings", label: "設定", icon: Settings },
];

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 p-2">
      {navItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-gray-200 text-gray-900"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** デスクトップ用サイドバー */
export function Sidebar() {
  return (
    <aside className="hidden w-56 flex-col border-r border-gray-200 bg-gray-50 md:flex">
      <div className="flex h-14 items-center border-b border-gray-200 px-4">
        <Link href="/" className="text-lg font-bold text-gray-900">
          kabu-drop-watcher
        </Link>
      </div>
      <SidebarContent />
    </aside>
  );
}
