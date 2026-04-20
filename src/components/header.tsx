import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/app/logout-button";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="flex h-14 items-center justify-end border-b border-gray-200 px-6">
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">{user?.email}</span>
        <LogoutButton />
      </div>
    </header>
  );
}
