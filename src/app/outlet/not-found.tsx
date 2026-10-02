import Link from "next/link";

export default function OutletNotFound() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-10">
      <h1 className="font-display text-3xl font-light">Outlet tidak ditemukan.</h1>
      <p className="mt-4 text-seduh-soft">Lokasi ini belum tersedia. Temukan outlet lain di daftar kami.</p>
      <Link href="/outlet" className="mt-6 inline-flex min-h-11 items-center text-genteng underline underline-offset-4 hover:text-genteng-deep">Lihat semua outlet</Link>
    </div>
  );
}
