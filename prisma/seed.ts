// Semua data contoh ada di sini; ganti dengan data asli bisnis.
import { PrismaClient } from "@prisma/client";
import { developmentPhotoPath } from "../src/lib/product-photography";
const db = new PrismaClient();

const categories = [
  { slug: "teh", name: "Teh", sort: 1 },
  { slug: "teh-susu", name: "Teh Susu", sort: 2 },
  { slug: "teh-buah", name: "Teh Buah", sort: 3 },
  { slug: "kopi", name: "Kopi", sort: 4 },
  { slug: "camilan", name: "Camilan", sort: 5 },
];
const products = [
  ["teh", "teh-tawar-hangat", "Teh Tawar Hangat", "Teh melati pekat, tanpa gula. Pilihan paling jujur.", 8000, 0, false],
  ["teh", "teh-manis-tehyan", "Teh Manis Tehyan", "Racikan teh hitam khas kedai, manis seimbang.", 10000, 2, true],
  ["teh-susu", "teh-tarik-tehyan", "Teh Tarik Tehyan", "Teh pekat, susu kental, ditarik sampai berbusa.", 16000, 3, true],
  ["teh-susu", "teh-susu-gula-aren", "Teh Susu Gula Aren", "Gurih susu, wangi gula aren, tidak terlalu manis.", 18000, 2, false],
  ["teh-buah", "teh-lemon-madu", "Teh Lemon Madu", "Segar, ringan, sedikit asam dari lemon. Cocok diminum dingin.", 18000, 1, true],
  ["teh-buah", "teh-leci", "Teh Leci", "Teh dengan sirup leci dan buah leci utuh.", 20000, 2, false],
  ["kopi", "kopi-susu-tehyan", "Kopi Susu Tehyan", "Kopi robusta, susu segar, gula aren.", 20000, 2, false],
  ["camilan", "pisang-goreng", "Pisang Goreng", "Pisang kepok, tepung renyah, porsi 5 potong.", 15000, 0, true],
] as const;

const demoOutlets = [
  {
    slug: "tehyan-margonda-demo", name: "Tehyan Margonda (Demo)", city: "Depok",
    address: "Alamat contoh area Margonda, Depok. Bukan lokasi resmi.",
    phone: "", description: "Data demo pengembangan untuk outlet area Margonda. Alamat, fasilitas, dan jam di halaman ini adalah contoh, bukan informasi lokasi resmi Tehyan.",
    facilities: ["Area duduk", "Wi-Fi", "Takeaway"], featured: true,
    hours: Array.from({ length: 7 }, (_, weekday) => ({ weekday, openMin: 600, closeMin: 1260 })),
  },
  {
    slug: "tehyan-beji-demo", name: "Tehyan Beji (Demo)", city: "Depok",
    address: "Alamat contoh area Beji, Depok. Bukan lokasi resmi.",
    phone: "", description: "Data demo pengembangan untuk outlet area Beji. Alamat, fasilitas, dan jam di halaman ini adalah contoh, bukan informasi lokasi resmi Tehyan.",
    facilities: ["Area duduk", "Stopkontak", "Takeaway"], featured: true,
    hours: Array.from({ length: 7 }, (_, weekday) => ({
      weekday, openMin: weekday === 0 || weekday === 6 ? 720 : 660,
      closeMin: weekday === 0 || weekday === 6 ? 1260 : 1200,
    })),
  },
  {
    slug: "tehyan-sawangan-demo", name: "Tehyan Sawangan (Demo)", city: "Depok",
    address: "Alamat contoh area Sawangan, Depok. Bukan lokasi resmi.",
    phone: "", description: "Data demo pengembangan untuk outlet area Sawangan. Alamat, fasilitas, dan jam di halaman ini adalah contoh, bukan informasi lokasi resmi Tehyan.",
    facilities: ["Area luar ruang", "Takeaway"], featured: false,
    hours: [0, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, openMin: 600, closeMin: 1200 })),
  },
];

async function seedOutlets() {
  await db.$transaction(async (tx) => {
    for (const { hours, ...data } of demoOutlets) {
      let store = await tx.store.findUnique({ where: { slug: data.slug } });
      if (store) continue;
      if (!store && data.slug === "tehyan-margonda-demo") {
        // Only adopt the exact placeholder from the original seed, preserving its ID and hours.
        const legacyDemo = await tx.store.findFirst({ where: {
          slug: null, name: "Kedai Tehyan", address: "Jl. Contoh No. 12, Depok, Jawa Barat",
          phone: "0812-0000-0000", description: null, imageUrl: null, mapsUrl: null,
          facilities: { isEmpty: true }, featured: false, active: true,
        } });
        if (legacyDemo) store = await tx.store.update({ where: { id: legacyDemo.id }, data });
      }
      store ??= await tx.store.upsert({ where: { slug: data.slug }, update: {}, create: data });
      for (const hour of hours) {
        await tx.storeHour.upsert({
          where: { storeId_weekday: { storeId: store.id, weekday: hour.weekday } },
          update: {}, create: { storeId: store.id, ...hour },
        });
      }
    }
  });
}

async function main() {
  for (const c of categories) await db.category.upsert({ where: { slug: c.slug }, update: c, create: c });
  for (const [cat, slug, name, description, price, sweetness, isBestSeller] of products) {
    const category = await db.category.findUniqueOrThrow({ where: { slug: cat } });
    const imageUrl = developmentPhotoPath(slug);
    await db.product.upsert({
      where: { slug },
      update: { name, description, price, sweetness, isBestSeller },
      create: { slug, name, description, price, sweetness, isBestSeller, imageUrl, categoryId: category.id },
    });
    if (imageUrl) await db.product.updateMany({ where: { slug, imageUrl: null }, data: { imageUrl } });
  }
  await seedOutlets();
  if (!(await db.promotion.count()))
    await db.promotion.create({ data: { title: "Beli 2 Teh Susu, gratis 1 Pisang Goreng", detail: "Berlaku Senin–Kamis, selama persediaan ada." } });
  if (!(await db.faq.count()))
    await db.faq.createMany({ data: [
      { question: "Apakah ada delivery?", answer: "Ada, untuk area sekitar kedai. Ongkir dihitung saat checkout. Pickup juga tersedia.", topic: "pesanan" },
      { question: "Bisa atur level gula?", answer: "Bisa. Pilih level gula dan es di halaman produk.", topic: "pesanan" },
      { question: "Bagaimana kebijakan refund?", answer: "Jika pesanan salah atau rusak, hubungi kami maksimal 1 jam setelah diterima.", topic: "kebijakan" },
    ] });
}
main().finally(() => db.$disconnect());
