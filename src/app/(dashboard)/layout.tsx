import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { HashScroll } from "./hash-scroll";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
      <HashScroll />
    </div>
  );
}
