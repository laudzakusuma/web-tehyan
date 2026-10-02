import type { Metadata } from "next";
import { Suspense } from "react";
import OutletDirectory from "@/components/outlets/OutletDirectory";

export const metadata: Metadata = {
  title: "Outlet",
  description: "Temukan outlet Kedai Tehyan, alamat, fasilitas, dan jam operasionalnya.",
};
export const dynamic = "force-dynamic";

export default function OutletsPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-24 pt-12 md:px-10 md:pt-16">
      <div className="mb-12 grid gap-6 md:grid-cols-12 md:items-end">
        <h1 className="font-display text-4xl font-light leading-tight md:col-span-7 md:text-5xl">Outlet Tehyan</h1>
        <p className="max-w-[38ch] text-seduh-soft md:col-span-5">
          Alamat, fasilitas, dan jam buka. Pilih tempat untuk singgah dan menikmati tehmu.
        </p>
      </div>
      <Suspense fallback={<p role="status" className="border-t border-pasir py-12 text-seduh-soft">Memuat informasi outlet...</p>}>
        <OutletDirectory />
      </Suspense>
    </div>
  );
}

