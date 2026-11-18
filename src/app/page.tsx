import Categories from "@/components/landing/Categories";
import FeaturedProducts from "@/components/landing/FeaturedProducts";
import Hero from "@/components/landing/Hero";
import Services from "@/components/landing/Services";
import ValueProps from "@/components/landing/ValueProps";

export default function Home() {
  return (
    <>
      <Hero />
      <Categories />
      <FeaturedProducts />
      <Services />
      <ValueProps />
    </>
  );
}
