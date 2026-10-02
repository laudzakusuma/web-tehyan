import Link from "next/link";
import OutletList from "@/components/outlets/OutletList";
import Reveal from "@/components/ui/Reveal";
import { listFeaturedOutlets } from "@/server/services/outlets";

export default async function OutletPreview() {
  const outlets = await listFeaturedOutlets().catch(() => null);

  return (
    <section className="border-t border-pasir">
      <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-10 md:py-24">
        <Reveal>
          <div className="mb-10 grid gap-6 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7">
              <p className="text-sm text-daun">Outlet Tehyan</p>
              <h2 className="mt-3 max-w-[20ch] font-display text-3xl font-light leading-tight md:text-4xl">
                Temukan Tehyan di dekatmu.
              </h2>
            </div>
            <Link href="/outlet" className="inline-flex min-h-11 items-center text-sm text-genteng underline underline-offset-4 hover:text-genteng-deep md:col-span-5 md:justify-self-end">
              Lihat semua outlet
            </Link>
          </div>
        </Reveal>
        {outlets && outlets.length > 0 ? <OutletList outlets={outlets} headingLevel={3} /> : (
          <p className="border-t border-pasir py-8 text-sm text-seduh-soft">
            {outlets === null ? "Informasi outlet sedang belum bisa dimuat." : "Lokasi Tehyan akan segera hadir di sini."}
          </p>
        )}
      </div>
    </section>
  );
}
