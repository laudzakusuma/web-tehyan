"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function OutletError({ reset }: { reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-10">
      <h1 className="font-display text-3xl font-light">Informasi outlet belum bisa dimuat.</h1>
      <p className="mt-4 max-w-[48ch] text-seduh-soft">Maaf, ada kendala saat mengambil informasi. Silakan coba lagi sebentar.</p>
      <div className="mt-8 flex flex-wrap items-center gap-6">
        <button type="button" disabled={pending} onClick={() => startTransition(() => { router.refresh(); reset(); })}
          className="min-h-11 rounded-field bg-genteng px-5 text-kertas hover:bg-genteng-deep disabled:opacity-60">
          {pending ? "Memuat..." : "Coba lagi"}
        </button>
        <Link href="/outlet" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-genteng">Kembali ke outlet</Link>
      </div>
    </div>
  );
}
