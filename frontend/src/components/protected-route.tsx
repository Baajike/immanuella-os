"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useCurrentUser } from "@/lib/auth";
import type { User } from "@/types";

interface ProtectedRouteState {
  user: User;
  isLoading: false;
  error: string | null;
  reload: ReturnType<typeof useCurrentUser>["reload"];
}

interface ProtectedRouteProps {
  children: (state: ProtectedRouteState) => ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const authState = useCurrentUser();

  useEffect(() => {
    if (!authState.isLoading && !authState.user && !authState.error) {
      router.replace("/login");
    }
  }, [authState.error, authState.isLoading, authState.user, router]);

  if (authState.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-sm text-[#c7b8c3]">Checking your session...</p>
      </main>
    );
  }

  if (!authState.user) {
    if (authState.error) {
      return (
        <main className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-md rounded-lg border border-red-300/20 bg-red-500/10 p-5 text-center">
            <p className="text-sm leading-6 text-red-100">{authState.error}</p>
            <button
              className="mt-4 rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-[#fff8e7] transition hover:bg-white/[0.06]"
              onClick={() => void authState.reload()}
              type="button"
            >
              Try again
            </button>
          </div>
        </main>
      );
    }

    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-sm text-[#c7b8c3]">Redirecting to login...</p>
      </main>
    );
  }

  return (
    <>
      {children({
        user: authState.user,
        isLoading: false,
        error: authState.error,
        reload: authState.reload,
      })}
    </>
  );
}
