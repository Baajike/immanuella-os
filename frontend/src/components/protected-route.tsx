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
    if (!authState.isLoading && !authState.user) {
      router.replace("/login");
    }
  }, [authState.isLoading, authState.user, router]);

  if (authState.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-sm text-[#c7b8c3]">Checking your session...</p>
      </main>
    );
  }

  if (!authState.user) {
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
