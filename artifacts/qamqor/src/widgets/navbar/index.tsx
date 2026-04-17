import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, Globe, Menu, X, ChevronDown } from "lucide-react";
import { useAccessibility } from "@features/accessibility/model/context";
import { useLanguage } from "@features/language/model/context";
import { Locale } from "@shared/lib/i18n/translations";
import { Button } from "@shared/ui/button";

const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: "ru", label: "Русский", flag: "RU" },
  { code: "kz", label: "Қазақша", flag: "KZ" },
  { code: "en", label: "English", flag: "EN" },
];

export default function Navbar() {
  const { isHighContrast, toggleHighContrast } = useAccessibility();
  const { locale, setLocale, t } = useLanguage();
  const [, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const navLinks = [
    { href: "#hero", label: t("nav.home") },
    { href: "#how-it-works", label: t("nav.howItWorks") },
    { href: "#find-helpers", label: t("nav.services") },
    { href: "#testimonials", label: t("nav.reviews") },
  ];

  const currentLocale = LOCALES.find((l) => l.code === locale)!;

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-sm"
        role="banner"
      >
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center space-x-2 shrink-0" aria-label="Qamqor — главная страница">
              <span className="text-2xl font-bold text-primary tracking-tight">Qamqor</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6" aria-label="Основная навигация">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-foreground/75 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <div ref={langRef} className="relative hidden sm:block">
              <button
                onClick={() => setLangOpen((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-foreground/75 hover:text-primary hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Выбрать язык"
                aria-expanded={langOpen}
                aria-haspopup="listbox"
              >
                <Globe className="h-4 w-4" aria-hidden="true" />
                <span className="font-semibold">{currentLocale.flag}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${langOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>

              {langOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-40 bg-card border border-border rounded-xl shadow-lg py-1 z-50"
                  role="listbox"
                  aria-label="Выбор языка"
                >
                  {LOCALES.map((l) => (
                    <button
                      key={l.code}
                      role="option"
                      aria-selected={locale === l.code}
                      onClick={() => { setLocale(l.code); setLangOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-primary/5 hover:text-primary ${
                        locale === l.code ? "text-primary font-semibold bg-primary/5" : "text-foreground/75"
                      }`}
                    >
                      <span className="text-xs font-bold w-6 text-center bg-muted rounded px-1 py-0.5">{l.flag}</span>
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleHighContrast}
              aria-label={isHighContrast ? t("nav.accessibilityOff") : t("nav.accessibilityOn")}
              aria-pressed={isHighContrast}
              className="hidden lg:flex items-center gap-2 text-sm"
            >
              {isHighContrast ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              <span>{isHighContrast ? t("nav.accessibilityOff") : t("nav.accessibilityOn")}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleHighContrast}
              aria-label={isHighContrast ? t("nav.accessibilityOff") : t("nav.accessibilityOn")}
              aria-pressed={isHighContrast}
              className="lg:hidden"
            >
              {isHighContrast ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>

            <div className="hidden sm:flex items-center gap-2">
              <Button variant="ghost" size="sm" className="font-medium" aria-label={t("nav.login")} onClick={() => navigate("/auth?tab=login")}>
                {t("nav.login")}
              </Button>
              <Button
                size="sm"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-medium"
                aria-label={t("nav.register")}
                onClick={() => navigate("/auth?tab=register")}
              >
                {t("nav.register")}
              </Button>
            </div>

            <button
              className="md:hidden p-2 rounded-md text-foreground/75 hover:text-primary hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Закрыть меню" : "Открыть меню"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div
          id="mobile-menu"
          className="fixed inset-0 top-16 z-40 bg-background/98 backdrop-blur-sm md:hidden overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Мобильное меню"
        >
          <div className="container py-6 flex flex-col gap-2">
            <nav className="flex flex-col gap-1" aria-label="Мобильная навигация">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-base font-medium text-foreground/80 hover:text-primary hover:bg-primary/5 transition-colors px-4 py-3 rounded-xl"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="border-t border-border my-4" />

            <div className="px-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Язык / Тіл / Language
              </p>
              <div className="flex flex-col gap-1">
                {LOCALES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => { setLocale(l.code); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      locale === l.code
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/75 hover:bg-primary/5 hover:text-primary"
                    }`}
                  >
                    <span className="text-xs font-bold w-8 text-center bg-muted rounded px-1.5 py-0.5">{l.flag}</span>
                    {l.label}
                    {locale === l.code && (
                      <span className="ml-auto w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border my-4" />

            <div className="px-4 flex flex-col gap-3">
              <button
                onClick={() => { toggleHighContrast(); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-foreground/75 hover:bg-primary/5 hover:text-primary transition-colors"
                aria-pressed={isHighContrast}
              >
                {isHighContrast ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                {isHighContrast ? t("nav.accessibilityOff") : t("nav.accessibilityOn")}
              </button>

              <Button variant="ghost" className="w-full justify-start font-medium" onClick={() => { setMobileOpen(false); navigate("/auth?tab=login"); }}>
                {t("nav.login")}
              </Button>
              <Button
                className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-medium"
                onClick={() => { setMobileOpen(false); navigate("/auth?tab=register"); }}
              >
                {t("nav.register")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
