"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

export function ApplicationStatusLookupForm() {
  const router =
    useRouter();

  const [
    code,
    setCode,
  ] = useState("");

  function submit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalized =
      code.trim();

    if (!normalized) {
      return;
    }

    router.push(
      `/karier/status/${encodeURIComponent(
        normalized,
      )}`,
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mt-8"
    >
      <label className="block">
        <span className="mb-2 block text-sm">
          Kode lamaran
        </span>

        <input
          required
          value={code}
          onChange={(event) =>
            setCode(
              event.target.value,
            )
          }
          className="h-12 w-full border border-pasir bg-transparent px-4 font-mono text-sm outline-none focus:border-seduh"
          placeholder="KAR.cmur..."
        />
      </label>

      <button
        type="submit"
        className="mt-4 inline-flex h-12 items-center bg-seduh px-6 text-gading"
      >
        Cek status
      </button>
    </form>
  );
}