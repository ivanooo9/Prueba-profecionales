import Hero from "@/components/hero"
import Services from "@/components/services"
import Vaccination from "@/components/vaccination"
import Events from "@/components/events"
import Adoption from "@/components/adoption"
import Products from "@/components/products"
import Contact from "@/components/contacts"
import BlogSection from "@/components/blog-section"
import ScrollToTop from "@/components/scroll-to-top"

import WalkingAnimals from "@/components/WalkingAnimals"

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-x-clip">
      <ScrollToTop />
      {/* Scroll-based Gradient Background */}
      {/* H-full ensures it covers the entire scrollable height, creating the changing color effect */}
      <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(to bottom, #f2619c 0%, #ffffff 100%)" }} />

      <Hero />
      <Products />
      <Services />
      <Vaccination />
      <Events />
      <Adoption />
      <BlogSection />
      <Contact />
      <WalkingAnimals />
    </main>
  )
}
