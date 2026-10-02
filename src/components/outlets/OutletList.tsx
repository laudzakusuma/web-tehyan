import Link from "next/link";
import { getHoursSummary, getOutletImageSrc, isOutletSlug } from "@/lib/outlets";
import type { PublicOutlet } from "@/server/services/outlets";
import OutletImage from "./OutletImage";

export default function OutletList({ outlets, headingLevel = 2 }: { outlets: PublicOutlet[]; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <ul className="border-t border-seduh">
      {outlets.map((outlet, index) => {
        const href = outlet.slug && isOutletSlug(outlet.slug) ? `/outlet/${outlet.slug}` : null;
        const imageSrc = getOutletImageSrc(outlet.imageUrl);
        return (
          <li key={outlet.id} className="grid min-w-0 gap-6 border-b border-pasir py-8 md:grid-cols-12 md:gap-5 md:py-10">
            <span aria-hidden="true" className="text-sm tabular-nums text-daun md:col-span-1">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 md:col-span-4">
              <p className="text-sm text-daun">{outlet.city}</p>
              <Heading className="mt-2 break-words font-display text-2xl font-light leading-tight md:text-3xl">
                {href ? (
                  <Link href={href} className="underline-offset-4 hover:text-genteng hover:underline">
                    {outlet.name}
                  </Link>
                ) : outlet.name}
              </Heading>
              {imageSrc && (
                <OutletImage src={imageSrc} name={outlet.name} />
              )}
            </div>
            <div className="min-w-0 md:col-span-4">
              <p className="break-words text-sm leading-7 text-seduh-soft">{outlet.address}</p>
              {outlet.facilities.length > 0 && (
                <ul aria-label={`Fasilitas ${outlet.name}`} className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-daun">
                  {outlet.facilities.map((facility, i) => <li key={`${facility}-${i}`} className="max-w-full break-words">{facility}</li>)}
                </ul>
              )}
            </div>
            <div className="min-w-0 md:col-span-3 md:text-right">
              <p className="text-sm leading-7 text-seduh-soft">{getHoursSummary(outlet.hours)}</p>
              {href && (
                <Link href={href} aria-label={`Lihat outlet ${outlet.name}`}
                  className="mt-3 inline-flex min-h-11 items-center text-sm text-genteng underline underline-offset-4 hover:text-genteng-deep">
                  Lihat outlet
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
