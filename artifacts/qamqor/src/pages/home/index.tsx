import React from "react";
import Navbar from "@widgets/navbar";
import Hero from "@widgets/hero";
import HowItWorks from "@widgets/how-it-works";
import FindHelpers from "@widgets/find-helpers";
import Advantages from "@widgets/advantages";
import Testimonials from "@widgets/testimonials";
import CTABanner from "@widgets/cta-banner";
import Footer from "@widgets/footer";

export default function HomePage() {
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <Navbar />
      <main className="pt-16 flex-1">
        <Hero />
        <HowItWorks />
        <FindHelpers />
        <Advantages />
        <Testimonials />
        <CTABanner />
      </main>
      <Footer />
    </div>
  );
}
