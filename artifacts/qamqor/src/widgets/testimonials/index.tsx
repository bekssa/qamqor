import React from "react";
import { Avatar, AvatarFallback } from "@shared/ui/avatar";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { useLanguage } from "@features/language/model/context";

export default function Testimonials() {
  const { t } = useLanguage();

  const reviews = [
    { id: 1, nameKey: "testimonials.r1Name", roleKey: "testimonials.r1Role", textKey: "testimonials.r1Text" },
    { id: 2, nameKey: "testimonials.r2Name", roleKey: "testimonials.r2Role", textKey: "testimonials.r2Text" },
    { id: 3, nameKey: "testimonials.r3Name", roleKey: "testimonials.r3Role", textKey: "testimonials.r3Text" },
  ];

  return (
    <section id="testimonials" className="py-24 bg-background">
      <div className="container">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">{t("testimonials.title")}</h2>
          <p className="text-lg text-muted-foreground">{t("testimonials.subtitle")}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {reviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card border rounded-2xl p-8 shadow-sm flex flex-col"
              data-testid={`card-review-${review.id}`}
            >
              <div className="flex gap-1 mb-6" aria-label="Оценка: 5 звезд">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-5 h-5 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                ))}
              </div>
              <p className="text-foreground/80 italic mb-8 flex-grow">
                "{t(review.textKey)}"
              </p>
              <div className="flex items-center gap-4 mt-auto">
                <Avatar className="h-12 w-12 border bg-muted">
                  <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                    {t(review.nameKey).substring(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-semibold text-foreground">{t(review.nameKey)}</h4>
                  <p className="text-sm text-muted-foreground">{t(review.roleKey)}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
