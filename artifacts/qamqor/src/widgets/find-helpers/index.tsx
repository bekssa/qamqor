import React, { useState } from "react";
import { Button } from "@shared/ui/button";
import { motion } from "framer-motion";
import { Star, MapPin } from "lucide-react";
import { Avatar, AvatarFallback } from "@shared/ui/avatar";
import { useLanguage } from "@features/language/model/context";

type Category = "all" | "medical" | "household" | "escort";

const helpers = [
  { id: 1, name: "Алия К.", age: 28, category: "medical" as Category, rating: 4.9, reviews: 47, distance: "0.8" },
  { id: 2, name: "Мирас Т.", age: 35, category: "household" as Category, rating: 4.7, reviews: 31, distance: "1.2" },
  { id: 3, name: "Динара С.", age: 24, category: "escort" as Category, rating: 5.0, reviews: 23, distance: "2.1" },
  { id: 4, name: "Айдос Н.", age: 41, category: "medical" as Category, rating: 4.8, reviews: 52, distance: "1.5" },
  { id: 5, name: "Зарина Б.", age: 30, category: "household" as Category, rating: 4.9, reviews: 18, distance: "3.0" },
  { id: 6, name: "Кайрат У.", age: 38, category: "escort" as Category, rating: 4.6, reviews: 14, distance: "0.5" },
];

const CATEGORIES: Array<{ key: Category; labelKey: string }> = [
  { key: "all", labelKey: "findHelpers.catAll" },
  { key: "medical", labelKey: "findHelpers.catMedical" },
  { key: "household", labelKey: "findHelpers.catHousehold" },
  { key: "escort", labelKey: "findHelpers.catEscort" },
];

export default function FindHelpers() {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<Category>("all");

  const filteredHelpers = activeCategory === "all"
    ? helpers
    : helpers.filter((h) => h.category === activeCategory);

  return (
    <section id="find-helpers" className="py-24 bg-muted/30">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">{t("findHelpers.title")}</h2>
            <p className="text-lg text-muted-foreground">{t("findHelpers.subtitle")}</p>
          </div>
          <Button
            variant="outline"
            className="hidden md:flex border-primary text-primary hover:bg-primary/5"
            data-testid="button-show-all-desktop"
          >
            {t("findHelpers.showAll")}
          </Button>
        </div>

        <div className="flex overflow-x-auto pb-4 mb-8 gap-2 scrollbar-hide" role="tablist" aria-label="Категории помощников">
          {CATEGORIES.map(({ key, labelKey }) => (
            <Button
              key={key}
              role="tab"
              aria-selected={activeCategory === key}
              variant={activeCategory === key ? "default" : "outline"}
              onClick={() => setActiveCategory(key)}
              className={`rounded-full whitespace-nowrap ${
                activeCategory === key
                  ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  : "bg-background border-border hover:bg-muted"
              }`}
              data-testid={`tab-category-${key}`}
            >
              {t(labelKey)}
            </Button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHelpers.slice(0, 3).map((helper, index) => (
            <motion.div
              key={helper.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group"
              data-testid={`card-helper-${helper.id}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 border-2 border-primary/10">
                    <AvatarFallback className="bg-primary/5 text-primary font-bold text-lg">
                      {helper.name.substring(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{helper.name}, {helper.age}</h3>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" aria-hidden="true" />
                      <span className="font-medium text-foreground">{helper.rating}</span>
                      <span className="mx-1.5" aria-hidden="true">•</span>
                      <span>{helper.reviews} {t("findHelpers.reviews")}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm text-muted-foreground">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 shrink-0" aria-hidden="true">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <span className="font-medium text-foreground">{t(`findHelpers.cat${helper.category.charAt(0).toUpperCase() + helper.category.slice(1)}`)}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center mr-3 shrink-0">
                    <MapPin className="h-4 w-4 text-secondary" aria-hidden="true" />
                  </div>
                  <span>{helper.distance} км {t("findHelpers.from")}</span>
                </div>
              </div>

              <Button
                className="w-full bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary border-0 transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
                data-testid={`button-contact-${helper.id}`}
              >
                {t("findHelpers.contact")}
              </Button>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Button
            variant="outline"
            className="border-primary text-primary hover:bg-primary/5 w-full"
            data-testid="button-show-all-mobile"
          >
            {t("findHelpers.showAll")}
          </Button>
        </div>
      </div>
    </section>
  );
}
