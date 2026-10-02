"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/admin/login",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            email,
            password,
          }),
        },
      );

      const body =
        await response.json();

      if (!response.ok) {
        setError(
          body.error ??
            "Login gagal.",
        );

        return;
      }

      router.replace(
        "/admin/pesanan",
      );

      router.refresh();
    } catch {
      setError(
        "Tidak dapat terhubung ke server.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-10 space-y-6"
    >
      <label className="block">
        <span className="mb-2 block text-sm">
          Email admin
        </span>

        <input
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(event) =>
            setEmail(
              event.target.value,
            )
          }
          className="h-12 w-full border border-pasir bg-transparent px-4 outline-none transition-colors focus:border-seduh"
          placeholder="admin@tehyan.local"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm">
          Password
        </span>

        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) =>
            setPassword(
              event.target.value,
            )
          }
          className="h-12 w-full border border-pasir bg-transparent px-4 outline-none transition-colors focus:border-seduh"
        />
      </label>

      {error && (
        <div
          role="alert"
          className="border border-genteng p-4 text-sm text-genteng"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-12 w-full items-center justify-center bg-seduh px-5 text-gading transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Memeriksa..."
          : "Masuk ke Admin"}
      </button>
    </form>
  );
}