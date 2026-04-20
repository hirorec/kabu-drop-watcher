import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WatchlistTable } from "./watchlist-table";
import { AddTickerForm } from "./add-ticker-form";

export default async function WatchlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: watchlists } = await supabase
    .from("watchlists")
    .select("*")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ウォッチリスト</h1>
        <AddTickerForm />
      </div>
      <WatchlistTable items={watchlists ?? []} />
    </div>
  );
}
