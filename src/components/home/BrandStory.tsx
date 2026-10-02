import Link from "next/link";
import Reveal from "@/components/ui/Reveal";

export default function BrandStory() {
  return (
    <section className="bg-seduh text-gading">
      <div className="mx-auto grid max-w-[1200px] gap-16 px-4 py-24 md:grid-cols-12 md:px-10 md:py-32">
        <Reveal className="md:col-span-3">
          <p className="text-xs uppercase tracking-[0.22em] text-pasir">
            Tentang Tehyan
          </p>
        </Reveal>

        <div className="md:col-span-8 md:col-start-5">
          <Reveal>
            <p className="font-display text-3xl font-light leading-[1.25] md:text-5xl md:leading-[1.18]">
              Kami percaya secangkir teh yang baik tidak harus dibuat
              rumit.
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="mt-10 grid gap-8 md:grid-cols-2">
              <p className="text-sm leading-7 text-pasir">
                Kedai Tehyan berangkat dari kebiasaan sederhana:
                berkumpul, ngobrol, dan menikmati teh yang diseduh
                dengan benar.
              </p>

              <p className="text-sm leading-7 text-pasir">
                Kami memainkan racikan teh hitam, melati, susu, buah,
                dan bahan yang akrab dengan lidah Indonesia tanpa
                kehilangan karakter tehnya.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.16}>
            <Link
              href="/cerita"
              className="group mt-12 inline-flex items-center gap-5 border-b border-pasir/50 pb-2 text-sm transition-colors hover:border-gading"
            >
              Baca cerita kami

              <span
                aria-hidden
                className="transition-transform group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}