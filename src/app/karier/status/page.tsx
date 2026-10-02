import {
  ApplicationStatusLookupForm,
} from "@/features/careers/ApplicationStatusLookupForm";

export const metadata = {
  title:
    "Status Lamaran | Kedai Tehyan",
};

export default function ApplicationStatusPage() {
  return (
    <main className="mx-auto max-w-[900px] px-4 py-16 md:px-10 md:py-24">
      <p className="text-xs uppercase tracking-[0.22em] text-genteng">
        Karier Tehyan
      </p>

      <h1 className="mt-5 max-w-[12ch] font-display text-5xl font-light leading-[0.96] md:text-7xl">
        Cek status lamaranmu.
      </h1>

      <p className="mt-7 max-w-[55ch] leading-8 text-seduh-soft">
        Masukkan kode yang kamu
        terima setelah mengirim
        lamaran.
      </p>

      <div className="mt-12 max-w-[620px] border-t border-seduh pt-10">
        <ApplicationStatusLookupForm />
      </div>
    </main>
  );
}