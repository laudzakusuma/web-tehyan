import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OutletPreview from "@/components/home/OutletPreview";
import OutletList from "@/components/outlets/OutletList";
import { listActiveOutlets, listFeaturedOutlets, type PublicOutlet } from "@/server/services/outlets";
import OutletDirectory from "@/components/outlets/OutletDirectory";

vi.mock("@/server/services/outlets", () => ({
  listActiveOutlets: vi.fn(),
  listFeaturedOutlets: vi.fn(),
}));

beforeEach(() => vi.resetAllMocks());

describe("outlet availability states", () => {
  it("renders an understandable empty directory", async () => {
    vi.mocked(listActiveOutlets).mockResolvedValue([]);
    const html = renderToStaticMarkup(await OutletDirectory());
    expect(html).toContain("Belum ada outlet yang tersedia.");
    expect(html).not.toContain("Lihat outlet");
  });

  it("allows database errors to reach the route error boundary", async () => {
    vi.mocked(listActiveOutlets).mockRejectedValue(new Error("Database unavailable"));
    await expect(OutletDirectory()).rejects.toThrow("Database unavailable");
  });

  it("keeps the directory link when there are no featured outlets", async () => {
    vi.mocked(listFeaturedOutlets).mockResolvedValue([]);
    const html = renderToStaticMarkup(await OutletPreview());
    expect(html).toContain('href="/outlet"');
    expect(html).toContain("Lokasi Tehyan akan segera hadir di sini.");
  });

  it("contains preview failures without exposing internal diagnostics", async () => {
    vi.mocked(listFeaturedOutlets).mockRejectedValue(new Error("Private connection diagnostic"));
    const html = renderToStaticMarkup(await OutletPreview());
    expect(html).toContain("Informasi outlet sedang belum bisa dimuat.");
    expect(html).not.toContain("Private connection diagnostic");
  });

  it("displays legacy outlets without generating null-slug detail links", () => {
    const legacy: PublicOutlet = {
      id: "legacy", slug: null, name: "Outlet Lama", city: "Depok", address: "Alamat tersimpan",
      phone: "", description: null, imageUrl: null, mapsUrl: null, facilities: [], hours: [],
    };
    const html = renderToStaticMarkup(<OutletList outlets={[legacy]} />);
    expect(html).toContain("Outlet Lama");
    expect(html).toContain("Alamat tersimpan");
    expect(html).not.toContain('href="/outlet/');
    expect(html).toContain("Jam operasional belum tersedia");
  });
});
