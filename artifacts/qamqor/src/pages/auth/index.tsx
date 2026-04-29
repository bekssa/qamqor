import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Eye, EyeOff, ChevronDown, CalendarIcon } from "lucide-react";
import { useLanguage } from "@features/language/model/context";
import { useAuth } from "@features/auth/model/context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

const KAZAKHSTAN_CITIES = [
  "Алматы", "Астана", "Шымкент", "Караганда", "Актобе",
  "Тараз", "Павлодар", "Усть-Каменогорск", "Семей", "Атырау",
  "Костанай", "Кызылорда", "Уральск", "Петропавловск", "Актау",
  "Темиртау", "Туркестан", "Кокшетау", "Талдыкорган", "Жезказган"
];

type Tab = "register" | "login";

import logoImg from "@/assets/services/logo.png";

const QamqorLogo = () => (
  <div className="flex flex-col items-center gap-1 mb-8">
    <img src={logoImg} alt="Qamqor Logo" className="h-16 w-auto object-contain" />
    <span className="text-blue-700 font-bold text-xs tracking-[0.2em] uppercase">QAMQOR</span>
  </div>
);

function AuthInput({
  label,
  placeholder,
  value,
  onChange,
  error,
  type = "text",
  maxLength,
  rightElement,
  className = "",
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  maxLength?: number;
  rightElement?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all
            ${error ? "border-red-400 bg-red-50 focus:border-red-500" : "border-gray-200 bg-white focus:border-blue-500"}
            ${rightElement ? "pr-12" : ""}
          `}
          aria-invalid={!!error}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

function RoleSelect({
  label,
  placeholder,
  value,
  onChange,
  error,
  options,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="flex flex-col gap-1" ref={ref}>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full px-4 py-3 rounded-xl border text-sm flex items-center justify-between outline-none transition-all text-left
          ${error ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"}
          ${open ? "border-blue-500" : ""}
        `}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? "text-gray-900" : "text-gray-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-blue-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="relative z-50">
          <div className="absolute top-0 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg py-1 overflow-hidden">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full px-4 py-3 text-sm text-left hover:bg-blue-50 hover:text-blue-700 transition-colors
                  ${value === opt.value ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"}
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  const { sendOtp, setPendingUser, setFlow, loginWithPassword } = useAuth();

  const [tab, setTab] = useState<Tab>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get("tab") as Tab) || "login";
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [reg, setReg] = useState({
    lastName: "", firstName: "", email: "", phone: "+7",
    role: "", password: "", confirmPassword: "", agreed: false,
    birthDate: "", city: "",
  });
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  const lettersRegex = /^[a-zA-Zа-яА-ЯёЁәіңғүұқөҺ\s-]+$/u;

  const handlePhoneChange = (val: string) => {
    if (!val.startsWith("+7")) val = "+7" + val.replace(/\D/g, "");
    else val = "+7" + val.slice(2).replace(/\D/g, "");
    if (val.length <= 12) setReg((p) => ({ ...p, phone: val }));
  };

  const validateRegister = () => {
    const errors: Record<string, string> = {};
    if (!reg.lastName.trim()) errors.lastName = t("auth.required");
    else if (!lettersRegex.test(reg.lastName)) errors.lastName = t("auth.onlyLetters");
    if (!reg.firstName.trim()) errors.firstName = t("auth.required");
    else if (!lettersRegex.test(reg.firstName)) errors.firstName = t("auth.onlyLetters");
    if (!reg.email.trim()) errors.email = t("auth.required");
    else if (!emailRegex.test(reg.email)) errors.email = t("auth.emailInvalid");
    if (!reg.phone || reg.phone.length < 12) errors.phone = t("auth.phoneInvalid");
    if (!reg.role) errors.role = t("auth.required");
    if (!reg.birthDate) errors.birthDate = t("auth.required");
    if (!reg.city) errors.city = t("auth.required");
    if (!reg.password) errors.password = t("auth.required");
    else if (reg.password.length < 8) errors.password = t("auth.passwordMin");
    if (!reg.confirmPassword) errors.confirmPassword = t("auth.required");
    else if (reg.password !== reg.confirmPassword) errors.confirmPassword = t("auth.passwordMismatch");
    if (!reg.agreed) errors.agreed = t("auth.agreementRequired");
    return errors;
  };

  const validateLogin = () => {
    const errors: Record<string, string> = {};
    if (!loginForm.email.trim()) errors.email = t("auth.required");
    else if (!emailRegex.test(loginForm.email)) errors.email = t("auth.emailInvalid");
    if (!loginForm.password) errors.password = t("auth.required");
    return errors;
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    const errors = validateRegister();
    setRegErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setPendingUser({
      lastName: reg.lastName,
      firstName: reg.firstName,
      email: reg.email,
      phone: reg.phone,
      role: reg.role,
      password: reg.password,
      birthDate: reg.birthDate || undefined,
      city: reg.city || undefined,
    });
    setFlow("register");
    const ok = await sendOtp(reg.email);
    if (!ok) {
      setSubmitError("Не удалось отправить код. Проверьте email и попробуйте снова.");
      return;
    }
    navigate("/auth/verify");
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    const errors = validateLogin();
    setLoginErrors(errors);
    if (Object.keys(errors).length > 0) return;
    try {
      await loginWithPassword(loginForm.email, loginForm.password);
      if (loginForm.email.toLowerCase() === "adminbeks@gmail.com") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch {
      setSubmitError("Неверный email или пароль.");
    }
  };

  const roleOptions = [
    { value: "seek-help", label: t("auth.roleSeekHelp") },
    { value: "offer-help", label: t("auth.roleOfferHelp") },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="p-4 sm:p-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium"
          aria-label={t("auth.back")}
        >
          <ArrowLeft className="w-4 h-4" />
          {t("auth.back")}
        </button>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pb-12">
        <div className="w-full max-w-md">
          <QamqorLogo />

          <div className="flex rounded-full bg-blue-50 p-1 mb-8 shadow-inner">
            <button
              onClick={() => { setTab("register"); setSubmitError(""); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-full transition-all duration-200
                ${tab === "register" ? "bg-blue-600 text-white shadow" : "text-blue-400 hover:text-blue-600"}`}
            >
              {t("auth.tabRegister")}
            </button>
            <button
              onClick={() => { setTab("login"); setSubmitError(""); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-full transition-all duration-200
                ${tab === "login" ? "bg-blue-600 text-white shadow" : "text-blue-400 hover:text-blue-600"}`}
            >
              {t("auth.tabLogin")}
            </button>
          </div>

          {tab === "register" ? (
            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4" noValidate>
              <AuthInput
                label={`${t("auth.lastName")} *`}
                placeholder={t("auth.lastNamePlaceholder")}
                value={reg.lastName}
                onChange={(v) => setReg((p) => ({ ...p, lastName: v }))}
                error={regErrors.lastName}
              />
              <AuthInput
                label={`${t("auth.firstName")} *`}
                placeholder={t("auth.firstNamePlaceholder")}
                value={reg.firstName}
                onChange={(v) => setReg((p) => ({ ...p, firstName: v }))}
                error={regErrors.firstName}
              />
              <AuthInput
                label={`${t("auth.email")} *`}
                placeholder={t("auth.emailPlaceholder")}
                value={reg.email}
                onChange={(v) => setReg((p) => ({ ...p, email: v }))}
                error={regErrors.email}
                type="email"
              />
              <AuthInput
                label={`${t("auth.phone")} *`}
                placeholder="+7XXXXXXXXXX"
                value={reg.phone}
                onChange={handlePhoneChange}
                error={regErrors.phone}
                maxLength={12}
              />
              <RoleSelect
                label={t("auth.whoAreYou")}
                placeholder={t("auth.whoPlaceholder")}
                value={reg.role}
                onChange={(v) => setReg((p) => ({ ...p, role: v }))}
                error={regErrors.role}
                options={roleOptions}
              />
              <AuthInput
                label={`${t("auth.birthDate")} *`}
                placeholder={t("auth.birthDatePlaceholder")}
                value={reg.birthDate}
                onChange={(v) => {
                  const d = v.replace(/\D/g, "").slice(0, 8);
                  let fmt = d;
                  if (d.length > 2) fmt = `${d.slice(0, 2)}.${d.slice(2)}`;
                  if (d.length > 4) fmt = `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
                  setReg((p) => ({ ...p, birthDate: fmt }));
                }}
                maxLength={10}
                error={regErrors.birthDate}
                rightElement={
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="text-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center p-1 pr-0">
                        <CalendarIcon className="w-5 h-5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={reg.birthDate.length === 10 ? new Date(reg.birthDate.split('.').reverse().join('-')) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const y = date.getFullYear();
                            const m = String(date.getMonth() + 1).padStart(2, '0');
                            const d = String(date.getDate()).padStart(2, '0');
                            setReg((p) => ({ ...p, birthDate: `${d}.${m}.${y}` }));
                          }
                        }}
                        initialFocus
                        captionLayout="dropdown"
                        fromYear={1900}
                        toYear={new Date().getFullYear()}
                      />
                    </PopoverContent>
                  </Popover>
                }
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">{t("auth.city")} *</label>
                <Select value={reg.city} onValueChange={(v) => setReg((p) => ({ ...p, city: v }))}>
                  <SelectTrigger
                    className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${regErrors.city ? "border-red-400 bg-red-50" : "border-gray-200 bg-white hover:bg-gray-50 focus:border-blue-500"
                      } shadow-none [&>span]:line-clamp-1`}
                  >
                    <SelectValue placeholder={t("auth.cityPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {KAZAKHSTAN_CITIES.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {regErrors.city && <p className="text-xs text-red-500">{regErrors.city}</p>}
              </div>
              <AuthInput
                label={`${t("auth.setPassword")} *`}
                placeholder={t("auth.passwordPlaceholder")}
                value={reg.password}
                onChange={(v) => setReg((p) => ({ ...p, password: v }))}
                error={regErrors.password}
                type={showPassword ? "text" : "password"}
                rightElement={
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
              <AuthInput
                label={`${t("auth.confirmPassword")} *`}
                placeholder={t("auth.passwordPlaceholder")}
                value={reg.confirmPassword}
                onChange={(v) => setReg((p) => ({ ...p, confirmPassword: v }))}
                error={regErrors.confirmPassword}
                type={showConfirm ? "text" : "password"}
                rightElement={
                  <button type="button" onClick={() => setShowConfirm((v) => !v)} className="text-gray-400 hover:text-gray-600">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              <div className="flex flex-col gap-1">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reg.agreed}
                    onChange={(e) => setReg((p) => ({ ...p, agreed: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 accent-blue-600 cursor-pointer shrink-0"
                  />
                  <span className="text-sm text-gray-600">
                    {t("auth.agreement")}{" "}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                      {t("auth.agreementLink")}
                    </a>
                  </span>
                </label>
                {regErrors.agreed && <p className="text-xs text-red-500">{regErrors.agreed}</p>}
              </div>

              {submitError && (
                <p className="text-sm text-red-500 text-center bg-red-50 rounded-lg py-2 px-4">{submitError}</p>
              )}

              <button
                type="submit"
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors mt-2 shadow-md shadow-blue-200"
              >
                {t("auth.getConfirmation")}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4" noValidate>
              <AuthInput
                label={t("auth.email")}
                placeholder={t("auth.emailPlaceholder")}
                value={loginForm.email}
                onChange={(v) => setLoginForm((p) => ({ ...p, email: v }))}
                error={loginErrors.email}
                type="email"
              />
              <AuthInput
                label={t("auth.password") || "Пароль"}
                placeholder={t("auth.passwordPlaceholder") || "Введите пароль"}
                value={loginForm.password}
                onChange={(v) => setLoginForm((p) => ({ ...p, password: v }))}
                error={loginErrors.password}
                type={showLoginPassword ? "text" : "password"}
                rightElement={
                  <button type="button" onClick={() => setShowLoginPassword((v) => !v)} className="text-gray-400 hover:text-gray-600">
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate("/auth/forgot")}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {t("auth.forgotTitle")}
                </button>
              </div>

              {submitError && (
                <p className="text-sm text-red-500 text-center bg-red-50 rounded-lg py-2 px-4">{submitError}</p>
              )}

              <button
                type="submit"
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors mt-2 shadow-md shadow-blue-200"
              >
                {t("auth.login") || "Войти"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
