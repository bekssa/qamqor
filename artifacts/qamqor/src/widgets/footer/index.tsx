import React from "react";
import { Link } from "wouter";
import { MapPin, Phone, Mail, Instagram, Facebook, Twitter } from "lucide-react";
import { useLanguage } from "@features/language/model/context";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-card border-t pt-16 pb-8" role="contentinfo">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-2 mb-6" aria-label="Qamqor — главная страница">
              <span className="text-2xl font-bold text-primary tracking-tight">Qamqor</span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              {t("footer.description")}
            </p>
            <div className="flex items-center gap-4 pt-2">
              <a href="#" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="Instagram">
                <Instagram className="w-5 h-5" aria-hidden="true" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="Facebook">
                <Facebook className="w-5 h-5" aria-hidden="true" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="Twitter">
                <Twitter className="w-5 h-5" aria-hidden="true" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-6">{t("footer.navigation")}</h3>
            <ul className="space-y-4">
              <li><a href="#hero" className="text-muted-foreground hover:text-primary transition-colors text-sm">{t("footer.home")}</a></li>
              <li><a href="#how-it-works" className="text-muted-foreground hover:text-primary transition-colors text-sm">{t("footer.howItWorks")}</a></li>
              <li><a href="#find-helpers" className="text-muted-foreground hover:text-primary transition-colors text-sm">{t("footer.services")}</a></li>
              <li><a href="#testimonials" className="text-muted-foreground hover:text-primary transition-colors text-sm">{t("footer.reviews")}</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-6">{t("footer.forUsers")}</h3>
            <ul className="space-y-4">
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">{t("footer.findHelper")}</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">{t("footer.becomeVolunteer")}</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">{t("footer.becomeSpecialist")}</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">{t("footer.faq")}</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-6">{t("footer.contacts")}</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                <span className="text-muted-foreground text-sm">{t("footer.address")}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                <a href="tel:+77001234567" className="text-muted-foreground hover:text-primary transition-colors text-sm">+7 (700) 123-45-67</a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                <a href="mailto:info@qamqor.kz" className="text-muted-foreground hover:text-primary transition-colors text-sm">info@qamqor.kz</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {t("footer.copyright")}
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer.privacy")}</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer.terms")}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
