"use client";

export function AccountsPanel() {
  return (
    <section className="rounded-[28px] border border-slate-300 bg-[#f8fafc]/94 p-6 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.12)]">
      <h2 className="text-lg font-semibold text-slate-900">How student access works now</h2>
      <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
        <p>Students open the student portal, enter their DD number, and upload the current semester receipt.</p>
        <p>If the DD number is new, the system creates the student record automatically.</p>
        <p>After receipt validation, the request appears in Pending Requests for admin review and approval.</p>
        <p>No temporary password or manual student account creation is required anymore.</p>
      </div>
    </section>
  );
}
