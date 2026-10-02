"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";
import { useCartStore } from "@/features/cart/store";

const primaryNav = [
  { href: "/menu", label: "Menu" },
  { href: "/outlet", label: "Outlet" },
  { href: "/promo", label: "Promo" },
  { href: "/journal", label: "Journal" },
] as const;

const exploreNav = [
  { href: "/cerita", label: "Cerita Tehyan" },
  { href: "/teh-kami", label: "Teh Kami" },
  { href: "/karier", label: "Karier" },
] as const;

export default function Header() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);

  const count = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0),
  );

  useEffect(() => {
    setMobileOpen(false);
    setExploreOpen(false);
  }, [pathname]);

  function openChat() {
    window.dispatchEvent(new Event("tehyan:open-chat"));
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-pasir bg-gading">
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-4 md:px-10">
        {/* Brand */}
        <Link
          href="/"
          className="group relative z-50 flex items-center gap-3"
          aria-label="Kedai Tehyan"
        >
          <motion.span
            whileHover={reduceMotion ? undefined : { rotate: -4 }}
            transition={{ duration: 0.2 }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-seduh font-display text-sm"
          >
            T
          </motion.span>

          <div className="leading-none">
            <span className="block font-display text-lg">
              Kedai Tehyan
            </span>

            <span className="mt-1 hidden text-[10px] uppercase tracking-[0.22em] text-seduh-soft sm:block">
              Tea House · Depok
            </span>
          </div>
        </Link>

        {/* Desktop navigation */}
        <nav
          aria-label="Navigasi utama"
          className="hidden items-center gap-1 lg:flex"
        >
          {primaryNav.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative px-4 py-3 text-sm"
              >
                <span
                  className={
                    active
                      ? "text-seduh"
                      : "text-seduh-soft transition-colors hover:text-seduh"
                  }
                >
                  {item.label}
                </span>

                {active && (
                  <motion.span
                    layoutId="desktop-nav-active"
                    className="absolute inset-x-4 bottom-1 h-px bg-genteng"
                    transition={{
                      duration: reduceMotion ? 0 : 0.25,
                      ease: [0.2, 0, 0, 1],
                    }}
                  />
                )}
              </Link>
            );
          })}

          {/* Explore dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setExploreOpen(true)}
            onMouseLeave={() => setExploreOpen(false)}
          >
            <button
              type="button"
              onClick={() => setExploreOpen((value) => !value)}
              aria-expanded={exploreOpen}
              className="flex items-center gap-1 px-4 py-3 text-sm text-seduh-soft transition-colors hover:text-seduh"
            >
              Jelajahi

              <motion.span
                animate={{ rotate: exploreOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                aria-hidden
                className="text-xs"
              >
                ↓
              </motion.span>
            </button>

            <AnimatePresence>
              {exploreOpen && (
                <motion.div
                  initial={
                    reduceMotion
                      ? { opacity: 1 }
                      : { opacity: 0, y: 8 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  exit={
                    reduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, y: 6 }
                  }
                  transition={{ duration: 0.18 }}
                  className="absolute left-0 top-full w-56 pt-2"
                >
                  <div className="border border-pasir bg-kertas p-2 shadow-[var(--shadow-float)]">
                    {exploreNav.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-4 py-3 text-sm text-seduh-soft transition-colors hover:bg-gading hover:text-seduh"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 lg:flex">
          <button
            type="button"
            onClick={openChat}
            className="h-10 px-4 text-sm text-seduh-soft transition-colors hover:text-seduh"
          >
            Tanya Tehyan
          </button>

          <Link
            href="/keranjang"
            aria-label={`Keranjang, ${count} item`}
            className="group flex h-10 items-center gap-3 border border-pasir px-4 text-sm transition-colors hover:border-seduh"
          >
            Keranjang

            <span
              className="flex min-h-5 min-w-5 items-center justify-center rounded-full bg-seduh px-1.5 text-[11px] text-gading transition-transform group-hover:scale-105"
              aria-hidden
            >
              {count}
            </span>
          </Link>
        </div>

        {/* Mobile button */}
        <button
          type="button"
          aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((value) => !value)}
          className="relative z-50 flex h-11 w-11 flex-col items-center justify-center gap-[5px] lg:hidden"
        >
          <motion.span
            animate={
              mobileOpen
                ? { rotate: 45, y: 7 }
                : { rotate: 0, y: 0 }
            }
            className="block h-px w-6 bg-seduh"
          />

          <motion.span
            animate={{ opacity: mobileOpen ? 0 : 1 }}
            className="block h-px w-6 bg-seduh"
          />

          <motion.span
            animate={
              mobileOpen
                ? { rotate: -45, y: -5 }
                : { rotate: 0, y: 0 }
            }
            className="block h-px w-6 bg-seduh"
          />
        </button>
      </div>

      {/* Mobile navigation */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={
              reduceMotion
                ? { opacity: 1 }
                : { opacity: 0, y: -12 }
            }
            animate={{ opacity: 1, y: 0 }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: -8 }
            }
            transition={{
              duration: 0.25,
              ease: [0.2, 0, 0, 1],
            }}
            className="border-t border-pasir bg-gading lg:hidden"
          >
            <nav
              aria-label="Navigasi mobile"
              className="mx-auto max-w-[1200px] px-4 py-6"
            >
              <div className="space-y-1">
                {primaryNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center justify-between border-b border-pasir/70 py-4 font-display text-2xl"
                  >
                    {item.label}

                    <span
                      className="font-sans text-sm text-seduh-soft"
                      aria-hidden
                    >
                      ↗
                    </span>
                  </Link>
                ))}
              </div>

              <p className="mb-2 mt-8 text-xs uppercase tracking-[0.2em] text-seduh-soft">
                Jelajahi
              </p>

              <div className="grid grid-cols-2 gap-x-4">
                {exploreNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="border-b border-pasir/70 py-3 text-sm"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    openChat();
                  }}
                  className="h-11 border border-seduh px-4 text-sm"
                >
                  Tanya Tehyan
                </button>

                <Link
                  href="/keranjang"
                  className="flex h-11 items-center justify-center gap-2 bg-seduh px-4 text-sm text-gading"
                >
                  Keranjang
                  <span className="text-xs opacity-70">
                    ({count})
                  </span>
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
