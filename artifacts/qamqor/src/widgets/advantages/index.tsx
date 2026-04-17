import React from "react";
import { Shield, CheckCircle, Zap, BrainCircuit } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@features/language/model/context";

export default function Advantages() {
  const { t } = useLanguage();

  const advantages = [
    {
      id: 1,
      titleKey: "advantages.dataSecurity",
      descKey: "advantages.dataSecurityDesc",
      icon: <Shield className="h-8 w-8 text-primary" aria-hidden="true" />,
      color: "bg-blue-50 dark:bg-blue-950/20",
    },
    {
      id: 2,
      titleKey: "advantages.verifiedSpec",
      descKey: "advantages.verifiedSpecDesc",
      icon: <CheckCircle className="h-8 w-8 text-secondary" aria-hidden="true" />,
      color: "bg-green-50 dark:bg-green-950/20",
    },
    {
      id: 3,
      titleKey: "advantages.fastSearch",
      descKey: "advantages.fastSearchDesc",
      icon: <Zap className="h-8 w-8 text-orange-500" aria-hidden="true" />,
      color: "bg-orange-50 dark:bg-orange-950/20",
    },
    {
      id: 4,
      titleKey: "advantages.aiSupport",
      descKey: "advantages.aiSupportDesc",
      icon: <BrainCircuit className="h-8 w-8 text-purple-500" aria-hidden="true" />,
      color: "bg-purple-50 dark:bg-purple-950/20",
    },
  ];

  return (
    <section className="py-24 bg-card/50">
      <div className="container">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">{t("advantages.title")}</h2>
          <p className="text-lg text-muted-foreground">{t("advantages.subtitle")}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {advantages.map((adv, index) => (
            <motion.div
              key={adv.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex flex-col sm:flex-row gap-6 bg-card border rounded-2xl p-8 shadow-sm"
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${adv.color}`}>
                {adv.icon}
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3">{t(adv.titleKey)}</h3>
                <p className="text-muted-foreground leading-relaxed">{t(adv.descKey)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
