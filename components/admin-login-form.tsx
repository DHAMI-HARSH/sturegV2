"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const response = await fetch("/api/auth/admin/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const result = await response.json();

    setLoading(false);

    if (!response.ok) {
      toast.error(result.error ?? "Admin login failed");
      return;
    }

    toast.success(result.message ?? "Admin login successful");
    window.location.assign("/admin/dashboard/requests");
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[28px] border border-[rgba(20,46,92,0.14)] bg-[rgba(251,253,255,0.97)] p-6 shadow-[0_24px_60px_-36px_rgba(7,29,66,0.22)]">
      <h2 className="text-xl font-semibold text-[var(--foreground)]">Admin Login</h2>
      <div className="mt-5 space-y-3">
        <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </div>
    </form>
  );
}
