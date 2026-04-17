import React from "react";
import { Button } from "@shared/ui/button";
import { motion } from "framer-motion";
import { useLanguage } from "@features/language/model/context";
import { useAuth } from "@features/auth/model/context";
import { useLocation } from "wouter";

export default function Hero() {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const [, navigate] = useLocation();

  const handleFindHelper = () => {
    if (!currentUser) {
      navigate("/auth?tab=login");
      return;
    }
    const el = document.getElementById("find-helpers");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  const handleOfferHelp = () => {
    if (!currentUser) {
      navigate("/auth?tab=register");
      return;
    }
    const el = document.getElementById("how-it-works");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="hero" className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background pt-20 pb-32">
      <div className="container relative z-10">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col justify-center space-y-8"
          >
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl xl:text-6xl/none text-foreground">
                {t("hero.title")}
              </h1>
              <p className="max-w-[600px] text-lg text-muted-foreground md:text-xl leading-relaxed">
                {t("hero.subtitle")}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 h-14 px-8 text-base"
                data-testid="button-find-helper-hero"
                onClick={handleFindHelper}
              >
                {t("hero.findHelper")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-base border-primary text-primary hover:bg-primary/5"
                data-testid="button-offer-help-hero"
                onClick={handleOfferHelp}
              >
                {t("hero.offerHelp")}
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto lg:ml-auto flex items-center justify-center relative"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-primary/5 rounded-full blur-3xl -z-10" />
            <img
              src="https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?q=80&w=2000&auto=format&fit=crop"
              alt="Пожилой человек и волонтер улыбаются вместе"
              className="rounded-2xl shadow-2xl object-cover aspect-[4/3] w-full max-w-md border border-border/50"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
