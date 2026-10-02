import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import OutletImage from "@/components/outlets/OutletImage";
import { getOutletImageSrc, getPhoneHref, getSafeWebUrl, getWeeklyHours } from "@/lib/outlets";
import { getOutletBySlug } from "@/server/services/outlets";

type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const outlet = await getOutletBySlug((await params).slug);
  return outlet ? {
    title: outlet.name,
    description: `${outlet.name}, ${outlet.city}. ${outlet.address}`,
  } : { title: "Outlet tidak ditemukan" };
}

export default async function OutletPage({ params }: Props) {
  const outlet = await getOutletBySlug((await params).slug);
  if (!outlet) notFound();

  const mapsUrl = getSafeWebUrl(outlet.mapsUrl);
  const phoneHref = getPhoneHref(outlet.phone);
  const imageSrc = getOutletImageSrc(outlet.imageUrl);

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-24 pt-8 md:px-10 md:pt-12">
      <Link href="/outlet" className="inline-flex min-h-11 items-center text-sm text-seduh-soft underline underline-offset-4 hover:text-genteng">
        Kembali ke outlet
      </Link>
      <header className="mt-8 border-b border-pasir pb-10">
        <p className="text-sm text-daun">{outlet.city}</p>
        <h1 className="mt-3 break-words font-display text-3xl font-light leading-tight md:text-5xl">{outlet.name}</h1>
        {outlet.description && <p className="mt-6 max-w-[64ch] break-words leading-7 text-seduh-soft">{outlet.description}</p>}
      </header>
      {imageSrc && <OutletImage src={imageSrc} name={outlet.name} />}
      <div className="mt-10 grid gap-12 md:grid-cols-12 md:gap-10">
        <section aria-labelledby="outlet-info" className="min-w-0 md:col-span-6">
          <h2 id="outlet-info" className="font-display text-2xl font-light">Singgah di sini</h2>
          <dl className="mt-6 space-y-7 text-sm">
            <div>
              <dt className="text-daun">Alamat</dt>
              <dd className="mt-2 max-w-[48ch] break-words leading-7">{outlet.address}</dd>
              {mapsUrl && <dd className="mt-2"><a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center text-genteng underline underline-offset-4 hover:text-genteng-deep">
                Buka peta <span className="sr-only">(tab baru)</span>
              </a></dd>}
            </div>
            {outlet.phone.trim() && <div>
              <dt className="text-daun">Telepon</dt>
              <dd className="mt-2 break-words">{phoneHref ? <a href={phoneHref} className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-genteng">{outlet.phone}</a> : outlet.phone}</dd>
            </div>}
            <div>
              <dt className="text-daun">Fasilitas</dt>
              <dd className="mt-3">
                {outlet.facilities.length > 0 ? <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {outlet.facilities.map((facility, i) => <li key={`${facility}-${i}`} className="break-words border-b border-pasir pb-3">{facility}</li>)}
                </ul> : "Informasi fasilitas belum tersedia."}
              </dd>
            </div>
          </dl>
        </section>
        <section aria-labelledby="outlet-hours" className="min-w-0 border-t border-pasir pt-8 md:col-span-5 md:col-start-8 md:border-t-0 md:pt-0">
          <h2 id="outlet-hours" className="font-display text-2xl font-light">Jam operasional</h2>
          {outlet.hours.length > 0 ? <table className="mt-6 w-full text-left text-sm">
            <caption className="sr-only">Jam operasional {outlet.name} dalam WIB</caption>
            <tbody>
              {getWeeklyHours(outlet.hours).map((day) => <tr key={day.weekday} className="border-b border-pasir">
                <th scope="row" className="py-4 pr-4 font-normal">{day.name}</th>
                <td className="py-4 text-right tabular-nums text-seduh-soft">{day.schedule}</td>
              </tr>)}
            </tbody>
          </table> : <p className="mt-6 text-sm text-seduh-soft">Jam operasional belum tersedia.</p>}
        </section>
      </div>
    </div>
  );
}
