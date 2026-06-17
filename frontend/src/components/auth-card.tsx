import type { ReactNode } from "react";

interface AuthCardProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthCard({ eyebrow, title, description, children }: AuthCardProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-md rounded-lg border border-white/10 bg-white/[0.05] p-7 shadow-2xl shadow-black/30">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-parchment-200">
          {eyebrow}
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-[#fff8e7]">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-[#c7b8c3]">{description}</p>
        <div className="mt-7">{children}</div>
      </section>
    </main>
  );
}
