import Link from "next/link";

export const metadata = {
  title: "Cerita Tehyan | Kedai Tehyan",
  description:
    "Cerita tentang cara Kedai Tehyan memandang teh, ruang, dan kebiasaan menikmati waktu.",
};

const principles = [
  {
    number: "01",
    title: "Tidak terburu-buru.",
    body:
      "Kami menyukai teh karena ia tidak perlu selalu menjadi pusat perhatian. Kadang cukup hadir di meja, menemani percakapan, pekerjaan, atau jeda yang singkat.",
  },
  {
    number: "02",
    title: "Akrab, bukan rumit.",
    body:
      "Teh yang baik tidak harus terasa jauh. Kami lebih tertarik pada rasa yang mudah didekati, mudah diingat, dan membuat orang ingin kembali meminumnya.",
  },
  {
    number: "03",
    title: "Punya tempat.",
    body:
      "Bagi kami, minum teh bukan sekadar soal minuman. Ada meja, suasana, waktu, dan orang-orang yang ikut membentuk pengalaman di sekitarnya.",
  },
] as const;

export default function CeritaPage() {
  return (
    <main>
      <section className="mx-auto max-w-[1200px] px-4 pb-20 pt-16 md:px-10 md:pb-28 md:pt-24">
        <p className="text-xs uppercase tracking-[0.24em] text-genteng">
          Cerita Tehyan
        </p>

        <div className="mt-6 grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <h1 className="max-w-[10ch] font-display text-5xl font-light leading-[0.94] md:text-7xl lg:text-8xl">
            Teh tidak harus rumit untuk terasa berarti.
          </h1>

          <div className="max-w-[40ch] lg:pb-3">
            <p className="text-lg leading-8 text-seduh-soft">
              Kedai Tehyan adalah ruang untuk menikmati teh dengan cara yang
              lebih dekat, lebih santai, dan tidak terburu-buru.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-pasir">
        <div className="mx-auto grid max-w-[1200px] md:grid-cols-2">
          <div className="border-b border-pasir px-4 py-14 md:border-b-0 md:border-r md:px-10 md:py-20">
            <p className="text-xs uppercase tracking-[0.2em] text-seduh-soft">
              Yang kami percaya
            </p>

            <p className="mt-8 max-w-[18ch] font-display text-3xl font-light leading-[1.25] md:text-4xl">
              Ada sesuatu yang sederhana dari duduk bersama secangkir teh.
            </p>
          </div>

          <div className="px-4 py-14 md:px-10 md:py-20">
            <div className="max-w-[54ch] space-y-6 leading-8 text-seduh-soft">
              <p>
                Tidak semua momen harus besar. Sebagian justru tinggal lebih
                lama karena sederhana: teh hangat, meja yang nyaman, dan waktu
                yang berjalan sedikit lebih pelan.
              </p>

              <p>
                Cara kami memandang Tehyan lahir dari suasana itu. Bukan tentang
                membuat teh terasa eksklusif, tetapi membuatnya terasa dekat
                dengan keseharian.
              </p>

              <p>
                Karena itu, setiap bagian dari Kedai Tehyan diarahkan pada satu
                hal: memberi ruang agar orang bisa menikmati minumannya tanpa
                terlalu banyak gangguan.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-20 md:px-10 md:py-28">
        <div className="grid gap-10 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-genteng">
              Cara kami melihat teh
            </p>

            <h2 className="mt-4 max-w-[8ch] font-display text-4xl font-light leading-tight">
              Tiga hal sederhana.
            </h2>
          </div>

          <ol className="border-t border-seduh">
            {principles.map((item) => (
              <li
                key={item.number}
                className="grid gap-6 border-b border-pasir py-9 md:grid-cols-[70px_220px_minmax(0,1fr)] md:gap-8"
              >
                <span className="font-display text-2xl text-genteng">
                  {item.number}
                </span>

                <h3 className="font-display text-2xl font-light">
                  {item.title}
                </h3>

                <p className="max-w-[52ch] leading-7 text-seduh-soft">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-pasir">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-16 md:px-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-seduh-soft">
              Berikutnya
            </p>

            <h2 className="mt-4 max-w-[13ch] font-display text-4xl font-light md:text-5xl">
              Kenali teh yang kami sajikan.
            </h2>
          </div>

          <Link
            href="/teh-kami"
            className="inline-flex w-fit border-b border-seduh pb-1"
          >
            Lihat Teh Kami →
          </Link>
        </div>
      </section>
    </main>
  );
}