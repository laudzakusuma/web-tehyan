import type { Prisma } from "@prisma/client";
import { access } from "node:fs/promises";
import { developmentPhotoPath } from "../src/lib/product-photography";
import { productionTarget } from "./production-target";

const categories = [
  { slug: "teh", name: "Teh", sort: 1 },
  { slug: "teh-susu", name: "Teh Susu", sort: 2 },
  { slug: "teh-buah", name: "Teh Buah", sort: 3 },
];

const products = [
  { asset: "teh-manis-tehyan", category: "teh", name: "Teh Manis Tehyan (Demo)", description: "Teh hitam dengan rasa manis seimbang.", price: 10000 },
  { asset: "teh-tarik-tehyan", category: "teh-susu", name: "Teh Tarik Tehyan (Demo)", description: "Teh pekat dan susu kental dengan lapisan busa.", price: 16000 },
  { asset: "teh-lemon-madu", category: "teh-buah", name: "Teh Lemon Madu (Demo)", description: "Teh dengan rasa ringan dan sedikit asam dari lemon.", price: 18000 },
] as const;

const outlets = [
  { slug: "demo-presentasi-margonda", name: "Tehyan Margonda (Demo)", openMin: 600, closeMin: 1260 },
  { slug: "demo-presentasi-beji", name: "Tehyan Beji (Demo)", openMin: 660, closeMin: 1200 },
];

export async function seedDemoCatalog(tx: Prisma.TransactionClient) {
  const categoriesCreated = await tx.category.createMany({ data: categories, skipDuplicates: true });
  const rows = await tx.category.findMany({ where: { slug: { in: categories.map(c => c.slug) } }, select: { slug: true, id: true } });
  const categoryIds = new Map(rows.map(row => [row.slug, row.id]));
  const productsCreated = await tx.product.createMany({
    data: products.map(product => {
      const categoryId = categoryIds.get(product.category);
      if (!categoryId) throw new Error("DEMO_CATEGORY_MISSING");
      return {
        slug: `demo-presentasi-${product.asset}`,
        name: product.name,
        description: `${product.description} Produk dan harga simulasi untuk presentasi universitas.`,
        price: product.price,
        imageUrl: developmentPhotoPath(product.asset),
        isBestSeller: true,
        categoryId,
      };
    }),
    skipDuplicates: true,
  });

  let outletsCreated = 0;
  for (const { openMin, closeMin, ...outlet } of outlets) {
    const created = await tx.store.createManyAndReturn({
      data: {
        ...outlet, city: "Depok", featured: true,
        address: "Area simulasi di Depok untuk presentasi universitas.",
        description: "Outlet dan jam operasional simulasi. Lokasi ini bukan cabang resmi.",
        phone: "",
      },
      skipDuplicates: true,
      select: { id: true },
    });
    if (!created.length) continue;
    await tx.storeHour.createMany({
      data: Array.from({ length: 7 }, (_, weekday) => ({ storeId: created[0].id, weekday, openMin, closeMin })),
    });
    outletsCreated++;
  }

  return { categoriesCreated: categoriesCreated.count, productsCreated: productsCreated.count, outletsCreated };
}

async function main() {
  const args = process.argv.slice(2);
  for (const product of products) {
    const image = developmentPhotoPath(product.asset);
    if (!image) throw new Error("DEMO_ASSET_MISSING");
    await access(new URL(`../public${image}`, import.meta.url));
  }
  if (!args.includes("--apply")) {
    console.log(JSON.stringify({ mode: "plan", categories, products, outlets }));
    return;
  }
  const db = productionTarget(args);
  try {
    console.log(JSON.stringify(await db.$transaction(seedDemoCatalog)));
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  main().catch(() => {
    console.error("Demo seed failed. Check the approved Neon target, TLS, migrations, and assets.");
    process.exitCode = 1;
  });
}
