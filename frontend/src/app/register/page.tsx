"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { AuthCard } from "@/components/auth-card";
import { ApiError, login, register } from "@/lib/api";
import { saveTokens } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await register({ email, password, name });
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
      description="Create the account that will hold the plan, the streaks, and the weekly truth."
      eyebrow="Start clean"
      title="Register"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-[#fff8e7]">
          Name
          <input
            autoComplete="name"
            className="mt-2 w-full rounded-md border border-white/10 bg-plum-950/80 px-3 py-3 text-sm text-[#fff8e7] outline-none ring-parchment-200/40 transition focus:border-parchment-200 focus:ring-2"
            onChange={(event) => setName(event.target.value)}
            required
            type="text"
            value={name}
          />
        </label>

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
            autoComplete="new-password"
            className="mt-2 w-full rounded-md border border-white/10 bg-plum-950/80 px-3 py-3 text-sm text-[#fff8e7] outline-none ring-parchment-200/40 transition focus:border-parchment-200 focus:ring-2"
            minLength={8}
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
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#c7b8c3]">
        Already registered?{" "}
        <Link className="font-medium text-parchment-100" href="/login">
          Log in
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
  return "Registration failed. Check your details and try again.";
}
