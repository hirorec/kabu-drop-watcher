import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/app/logout-button";
import { MobileNav } from "@/components/mobile-nav";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 px-4 md:justify-end md:px-6">
      <MobileNav />
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-gray-500 sm:inline">
          {user?.email}
        </span>
        <LogoutButton />
      </div>
    </header>
  );
}
