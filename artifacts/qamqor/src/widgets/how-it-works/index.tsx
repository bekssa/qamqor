import React from "react";
import { Button } from "@shared/ui/button";
import { motion } from "framer-motion";
import { ClipboardEdit, Search, HeartHandshake, MessageSquare } from "lucide-react";
import { useLanguage } from "@features/language/model/context";

export default function HowItWorks() {
  const { t } = useLanguage();

  const steps = [
    {
      id: 1,
      titleKey: "howItWorks.step1Title",
      descKey: "howItWorks.step1Desc",
      icon: <ClipboardEdit className="h-8 w-8 text-primary" aria-hidden="true" />,
    },
    {
      id: 2,
      titleKey: "howItWorks.step2Title",
      descKey: "howItWorks.step2Desc",
      icon: <Search className="h-8 w-8 text-primary" aria-hidden="true" />,
    },
    {
      id: 3,
      titleKey: "howItWorks.step3Title",
      descKey: "howItWorks.step3Desc",
      icon: <HeartHandshake className="h-8 w-8 text-primary" aria-hidden="true" />,
    },
    {
      id: 4,
      titleKey: "howItWorks.step4Title",
      descKey: "howItWorks.step4Desc",
      icon: <MessageSquare className="h-8 w-8 text-primary" aria-hidden="true" />,
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-background">
      <div className="container">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">{t("howItWorks.title")}</h2>
          <p className="text-lg text-muted-foreground">{t("howItWorks.subtitle")}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card rounded-2xl p-8 border shadow-sm flex flex-col items-center text-center relative"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                {step.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3">{t(step.titleKey)}</h3>
              <p className="text-muted-foreground mb-6 flex-grow">{t(step.descKey)}</p>
              <Button variant="link" className="text-primary p-0 h-auto font-medium">
                {t("howItWorks.details")}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
