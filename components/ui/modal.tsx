"use client";

import { Button } from "@/components/ui/button";

export function Modal({
  open,
  title,
  children,
  onClose,
  panelClassName = "",
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  panelClassName?: string;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,29,66,0.34)] p-4 backdrop-blur-sm">
      <div className={`w-full max-w-lg rounded-[24px] border border-[rgba(20,46,92,0.18)] bg-[rgba(247,250,255,0.98)] p-6 shadow-[0_30px_90px_-30px_rgba(7,29,66,0.28)] ${panelClassName}`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">{title}</h3>
          <Button variant="ghost" className="h-9 px-3" onClick={onClose}>
            Close
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
