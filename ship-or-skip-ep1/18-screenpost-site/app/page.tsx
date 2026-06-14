import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import LogoCluster from "@/components/LogoCluster";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Faq from "@/components/Faq";
import FinalCta from "@/components/FinalCta";
import Footer from "@/components/Footer";
import RevealOnScroll from "@/components/RevealOnScroll";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <LogoCluster />
        <Features />
        <HowItWorks />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <RevealOnScroll />
    </>
  );
}
