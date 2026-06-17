"use client";

import { useRouter } from "next/navigation";

import { ProtectedRoute } from "@/components/protected-route";
import { clearTokens } from "@/lib/auth";

export default function DashboardPage() {
  const router = useRouter();

  function handleLogout() {
    clearTokens();
    router.push("/login");
  }

  return (
    <ProtectedRoute>
      {({ user }) => (
        <main className="min-h-screen px-6 py-10 sm:px-10">
          <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl flex-col justify-between rounded-lg border border-white/10 bg-white/[0.04] p-7 shadow-2xl shadow-black/20 sm:p-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-parchment-200">
                Protected dashboard
              </p>
              <h1 className="mt-4 text-4xl font-semibold text-[#fff8e7]">
                Hello, {user.name || user.email}.
              </h1>
              <div className="mt-6 rounded-lg border border-white/10 bg-plum-950/70 p-5">
                <p className="text-sm text-[#c7b8c3]">Current user</p>
                <p className="mt-2 text-lg font-medium text-[#fff8e7]">
                  {user.name || "No name set"}
                </p>
                <p className="mt-1 text-sm text-[#c7b8c3]">{user.email}</p>
              </div>
              <p className="mt-6 max-w-2xl text-base leading-7 text-[#d8cbd4]">
                The real dashboard comes next: daily plan, streaks, discipline
                score, and the recommendation card.
              </p>
            </div>

            <div className="mt-10 flex justify-end">
              <button
                className="rounded-md bg-parchment-100 px-4 py-3 text-sm font-semibold text-plum-950 transition hover:bg-parchment-200"
                onClick={handleLogout}
                type="button"
              >
                Log out
              </button>
            </div>
          </section>
        </main>
      )}
    </ProtectedRoute>
  );
}
