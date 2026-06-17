"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { AuthCard } from "@/components/auth-card";
import { ApiError, login } from "@/lib/api";
import { saveTokens } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const tokens = await login({ email, password });
      saveTokens(tokens);
      router.push("/dashboard");
    } catch (caught) {
      setError(getAuthErrorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      description="Log in to return to your plan, your scores, and the next honest step."
      eyebrow="Welcome back"
      title="Log in"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-[#fff8e7]">
          Email
          <input
            autoComplete="email"
            className="mt-2 w-full rounded-md border border-white/10 bg-plum-950/80 px-3 py-3 text-sm text-[#fff8e7] outline-none ring-parchment-200/40 transition focus:border-parchment-200 focus:ring-2"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>

        <label className="block text-sm font-medium text-[#fff8e7]">
          Password
          <input
            autoComplete="current-password"
            className="mt-2 w-full rounded-md border border-white/10 bg-plum-950/80 px-3 py-3 text-sm text-[#fff8e7] outline-none ring-parchment-200/40 transition focus:border-parchment-200 focus:ring-2"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        {error ? (
          <p className="rounded-md border border-red-300/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {error}
          </p>
        ) : null}

        <button
          className="w-full rounded-md bg-parchment-100 px-4 py-3 text-sm font-semibold text-plum-950 transition hover:bg-parchment-200 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#c7b8c3]">
        No account yet?{" "}
        <Link className="font-medium text-parchment-100" href="/register">
          Register
        </Link>
      </p>
    </AuthCard>
  );
}

function getAuthErrorMessage(caught: unknown) {
  if (caught instanceof ApiError) {
    return caught.message;
  }
  if (caught instanceof Error) {
    return caught.message;
  }
  return "Login failed. Check your details and try again.";
}
