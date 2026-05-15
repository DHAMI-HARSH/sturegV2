import { AdminSidebar } from "@/components/admin/sidebar";
import { requireAdmin } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export default async function AdminDashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen text-[var(--foreground)]">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <AdminSidebar />
        <div className="flex-1 p-6 lg:p-8">{children}</div>
      </div>
    </main>
  );
}
