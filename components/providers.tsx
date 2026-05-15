"use client";

import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        theme="light"
        toastOptions={{
          style: {
            background: "#ffffff",
            border: "1px solid rgba(30, 64, 175, 0.14)",
            color: "#0f172a",
            boxShadow: "0 24px 60px -28px rgba(15, 23, 42, 0.28)",
          },
        }}
      />
    </>
  );
}
