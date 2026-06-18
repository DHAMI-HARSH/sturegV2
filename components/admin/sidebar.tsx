"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Files, LayoutDashboard, LogOut, PenSquare, Settings, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const items = [
  { href: "/admin/dashboard/requests", label: "Pending Requests", icon: Files },
  { href: "/admin/dashboard/students", label: "Registered Students", icon: Users },
  { href: "/admin/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/dashboard/accounts", label: "Student Access", icon: LayoutDashboard },
  { href: "/admin/dashboard/form-editor", label: "Form Editor", icon: PenSquare },
  { href: "/admin/dashboard/config", label: "Semester Config", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    try {
      const response = await fetch("/api/auth/admin/logout", {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "Could not log out.");
      }

      router.replace("/admin/login");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not log out.");
    }
  }

  return (
    <aside className="flex w-full max-w-xs flex-col gap-2 border-r border-[rgba(20,46,92,0.12)] bg-[rgba(250,252,255,0.84)] p-4 backdrop-blur-xl">
      <div className="mb-4 rounded-[24px] border border-[rgba(31,79,153,0.14)] bg-linear-to-br from-[rgba(23,63,126,0.16)] via-[rgba(89,135,204,0.12)] to-white p-4">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--accent)]">Admin Portal</p>
        <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">Student Registration</h2>
      </div>
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition ${
              active
                ? "border border-[rgba(31,79,153,0.22)] bg-[rgba(31,79,153,0.1)] text-[var(--accent-strong)]"
                : "border border-transparent text-[var(--muted)] hover:bg-[rgba(20,46,92,0.06)] hover:text-[var(--foreground)]"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}

      <div className="mt-auto pt-4">
        <Button
          variant="secondary"
          onClick={logout}
          className="flex w-full items-center justify-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </Button>
      </div>
    </aside>
  );
}
