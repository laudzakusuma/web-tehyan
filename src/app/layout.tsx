import type { Metadata } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import ChatPanel from "@/features/chat/ChatPanel";
import Header from "@/components/site/Header";
import CartHydrator from "@/features/cart/CartHydrator";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument" });

export const metadata: Metadata = {
  title: { default: "Kedai Tehyan", template: "%s · Kedai Tehyan" },
  description: "Kedai teh di Depok. Teh yang sederhana, dibuat dengan rasa yang serius.",
  openGraph: { title: "Kedai Tehyan", locale: "id_ID", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${fraunces.variable} ${instrument.variable}`}>
      <body className="font-sans">
        <CartHydrator />
        <Header />
        <main>{children}</main>
        <ChatPanel />
      </body>
    </html>
  );
}
