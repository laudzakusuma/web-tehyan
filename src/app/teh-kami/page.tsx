import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Teh Kami | Kedai Tehyan",
  description:
    "Pilihan teh Kedai Tehyan, dari yang sederhana sampai racikan dengan susu dan buah.",
};

const teas = [
  {
    name: "Teh Manis Tehyan",
    image:
      "/images/products/teh-manis-tehyan.webp",
    note:
      "Rasa yang akrab dan langsung. Sebuah titik awal sederhana untuk menikmati Tehyan.",
  },
  {
    name: "Teh Tawar Hangat",
    image:
      "/images/products/teh-tawar-hangat.webp",
    note:
      "Tanpa banyak tambahan. Hangat, ringan, dan cocok untuk dinikmati perlahan.",
  },
  {
    name: "Teh Susu Gula Aren",
    image:
      "/images/products/teh-susu-gula-aren.webp",
    note:
      "Teh, susu, dan gula aren dalam karakter yang lebih lembut dan berisi.",
  },
  {
    name: "Teh Tarik Tehyan",
    image:
      "/images/products/teh-tarik-tehyan.webp",
    note:
      "Racikan teh susu dengan karakter yang lebih tebal dan familiar.",
  },
  {
    name: "Teh Leci",
    image:
      "/images/products/teh-leci.webp",
    note:
      "Pilihan yang lebih segar dengan sentuhan buah yang ringan.",
  },
  {
    name: "Teh Lemon Madu",
    image:
      "/images/products/teh-lemon-madu.webp",
    note:
      "Rasa segar dari lemon dengan karakter madu yang lebih lembut.",
  },
] as const;

export default function TehKamiPage() {
  return (
    <main>
      <section className="mx-auto max-w-[1200px] px-4 pb-16 pt-16 md:px-10 md:pb-24 md:pt-24">
        <p className="text-xs uppercase tracking-[0.24em] text-genteng">
          Teh Kami
        </p>

        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <h1 className="max-w-[10ch] font-display text-5xl font-light leading-[0.94] md:text-7xl">
            Dari yang sederhana sampai yang lebih berani.
          </h1>

          <p className="max-w-[40ch] leading-8 text-seduh-soft">
            Bukan katalog rasa yang rumit. Kami lebih suka pilihan yang mudah
            dipahami dan punya alasan untuk diminum lagi.
          </p>
        </div>
      </section>

      <section className="border-y border-pasir">
        <div className="mx-auto max-w-[1200px]">
          {teas.map((tea, index) => (
            <article
              key={tea.name}
              className="grid border-b border-pasir last:border-b-0 md:grid-cols-2"
            >
              <div
                className={
                  index % 2 === 1
                    ? "relative min-h-[420px] md:order-2"
                    : "relative min-h-[420px]"
                }
              >
                <Image
                  src={tea.image}
                  alt={tea.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>

              <div
                className={
                  index % 2 === 1
                    ? "flex min-h-[420px] flex-col justify-between px-4 py-10 md:order-1 md:px-10 md:py-14"
                    : "flex min-h-[420px] flex-col justify-between px-4 py-10 md:px-10 md:py-14"
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="font-display text-2xl text-genteng">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className="text-xs uppercase tracking-[0.18em] text-seduh-soft">
                    Racikan Tehyan
                  </span>
                </div>

                <div className="max-w-[420px]">
                  <h2 className="font-display text-4xl font-light leading-tight md:text-5xl">
                    {tea.name}
                  </h2>

                  <p className="mt-5 leading-7 text-seduh-soft">
                    {tea.note}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1200px] gap-10 px-4 py-16 md:px-10 md:py-24 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-genteng">
            Mau lihat semuanya?
          </p>

          <h2 className="mt-4 max-w-[13ch] font-display text-4xl font-light leading-tight md:text-5xl">
            Menu lengkap ada satu langkah lagi.
          </h2>
        </div>

        <Link
          href="/menu"
          className="inline-flex h-12 w-fit items-center border border-seduh px-6 transition-colors hover:bg-seduh hover:text-gading"
        >
          Buka menu lengkap
        </Link>
      </section>
    </main>
  );
}