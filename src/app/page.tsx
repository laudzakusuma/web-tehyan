import Hero from "@/components/home/Hero";
import FeaturedMenu from "@/components/home/FeaturedMenu";
import BrandStory from "@/components/home/BrandStory";
import OutletPreview from "@/components/home/OutletPreview";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedMenu />
      <BrandStory />
      <OutletPreview />
    </>
  );
}
