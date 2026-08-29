import FeaturedSection from "@/features/homepage/components/FeaturedSection";
import HeroSection from "@/features/homepage/components/HeroSection";
import ProductSection from "@/features/homepage/components/ProductSection";

export default function Home() {
  return (
    <>
      <HeroSection />
      <div id="collection">
        <ProductSection />
      </div>
      <FeaturedSection />
    </>
  );
}
