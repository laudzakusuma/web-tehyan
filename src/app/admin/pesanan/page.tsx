import {
  redirect,
} from "next/navigation";

import {
  getCurrentAdmin,
} from "@/server/auth/admin-session";

import {
  listAdminOrders,
} from "@/server/services/orders";

import {
  OrderStatusActions,
} from "@/features/admin/OrderStatusActions";

import Link from "next/link";

import {
  AdminLogoutButton,
} from "@/features/admin/AdminLogoutButton";

export const dynamic =
  "force-dynamic";

const rupiah = (
  value: number,
) =>
  `Rp${value.toLocaleString(
    "id-ID",
  )}`;

const statusLabel = {
  PENDING: "Pesanan diterima",
  CONFIRMED: "Dikonfirmasi",
  PREPARING: "Sedang disiapkan",
  READY: "Siap diambil",
  OUT_FOR_DELIVERY:
    "Sedang diantar",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
} as const;

const dateFormatter =
  new Intl.DateTimeFormat(
    "id-ID",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    },
  );

export default async function AdminOrdersPage() {
  const admin =
    await getCurrentAdmin();

  if (!admin) {
    redirect(
      "/admin/login",
    );
  }

  const orders =
    await listAdminOrders(50);

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-14 md:px-10 md:py-20">
      <header className="border-b border-seduh pb-8">
        <p className="text-xs uppercase tracking-[0.22em] text-genteng">
          Admin Tehyan
        </p>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-5xl font-light md:text-6xl">
              Pesanan
            </h1>

            <p className="mt-3 text-seduh-soft">
              Halo, {admin.name}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <p className="text-sm text-seduh-soft">
                {orders.length} pesanan terbaru
            </p>

            <Link
                href="/admin/promo"
                className="border-b border-transparent pb-1 text-sm hover:border-seduh"
            >
                Promo
            </Link>

            <Link
              href="/admin/journal"
              className="border-b border-transparent pb-1 text-sm hover:border-seduh"
            >
              Journal
            </Link>

            <AdminLogoutButton />
            </div>
        </div>
      </header>

      {orders.length === 0 ? (
        <section className="py-16">
          <p className="font-display text-2xl">
            Belum ada pesanan.
          </p>
        </section>
      ) : (
        <div className="divide-y divide-pasir">
          {orders.map(
            (order) => (
              <article
                key={order.id}
                className="grid gap-8 py-10 lg:grid-cols-[220px_minmax(0,1fr)_230px]"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-seduh-soft">
                    Kode
                  </p>

                  <p className="mt-2 break-all font-display text-xl">
                    {order.code}
                  </p>

                  <p className="mt-3 text-sm text-seduh-soft">
                    {dateFormatter.format(
                      order.createdAt,
                    )}{" "}
                    WIB
                  </p>

                  <p className="mt-4 inline-block border border-pasir px-3 py-1 text-xs uppercase tracking-[0.12em]">
                    {
                      statusLabel[
                        order.status
                      ]
                    }
                  </p>
                </div>

                <div>
                  <div className="flex flex-wrap justify-between gap-4">
                    <div>
                      <h2 className="font-display text-2xl">
                        {
                          order.customerName
                        }
                      </h2>

                      <p className="mt-1 text-sm text-seduh-soft">
                        {order.phone}
                      </p>
                    </div>

                    <p className="font-display text-xl">
                      {rupiah(
                        order.total,
                      )}
                    </p>
                  </div>

                  <ul className="mt-6 border-t border-pasir pt-4">
                    {order.items.map(
                      (item) => (
                        <li
                          key={
                            item.id
                          }
                          className="flex justify-between gap-5 py-2 text-sm"
                        >
                          <span>
                            {
                              item.quantity
                            }{" "}
                            × {item.name}
                          </span>

                          <span className="tabular-nums">
                            {rupiah(
                              item.unitPrice *
                                item.quantity,
                            )}
                          </span>
                        </li>
                      ),
                    )}
                  </ul>

                  {order.notes && (
                    <div className="mt-5 border-l border-genteng pl-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-seduh-soft">
                        Catatan
                      </p>

                      <p className="mt-1 text-sm">
                        {order.notes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t border-pasir pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                  <p className="mb-4 text-xs uppercase tracking-[0.16em] text-seduh-soft">
                    Aksi
                  </p>

                  <OrderStatusActions
                    code={order.code}
                    status={
                      order.status
                    }
                  />
                </div>
              </article>
            ),
          )}
        </div>
      )}
    </main>
  );
}