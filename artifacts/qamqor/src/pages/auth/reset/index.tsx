import React, { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Eye, EyeOff, CheckCircle } from "lucide-react";
import { useLanguage } from "@features/language/model/context";
import { useAuth } from "@features/auth/model/context";

const QamqorLogo = () => (
  <div className="flex flex-col items-center gap-1 mb-6">
    <div className="w-16 h-16 rounded-full border-2 border-blue-500 flex items-center justify-center bg-white shadow-sm">
      <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="12" r="5" fill="#F59E0B" />
        <path d="M10 28c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="#1E40AF" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M16 22c-2 1-4 3-4 6" stroke="#43AD36" strokeWidth="2" strokeLinecap="round" />
        <path d="M24 22c2 1 4 3 4 6" stroke="#43AD36" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
    <span className="text-blue-700 font-bold text-xs tracking-[0.2em] uppercase">QAMQOR</span>
  </div>
);

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  const { setFlow, setResetTarget } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const errs: { password?: string; confirm?: string } = {};
    if (!password) errs.password = t("auth.required");
    else if (password.length < 8) errs.password = t("auth.passwordMin");
    if (!confirmPassword) errs.confirm = t("auth.required");
    else if (password !== confirmPassword) errs.confirm = t("auth.passwordMismatch");
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSuccess(true);
    setFlow(null);
    setResetTarget(null);
    setTimeout(() => navigate("/auth?tab=login"), 2000);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "#e8f7eb" }}>
            <CheckCircle className="w-10 h-10" style={{ color: "#2C9C42" }} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t("auth.passwordChanged")}</h2>
          <p className="text-gray-500 text-sm">{t("auth.tabLogin")}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="p-4 sm:p-6">
        <button
          onClick={() => navigate("/auth/verify")}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("auth.back")}
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">
          <QamqorLogo />

          <h1 className="text-2xl font-bold text-gray-900 mb-8 text-center">{t("auth.resetTitle")}</h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">{t("auth.setPassword")}</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={t("auth.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
                  className={`w-full px-4 py-3 pr-12 rounded-xl border text-sm outline-none transition-all
                    ${errors.password ? "border-red-400 bg-red-50" : "border-gray-200 bg-white focus:border-blue-500"}
                  `}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">{t("auth.confirmPassword")}</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder={t("auth.passwordPlaceholder")}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirm: undefined })); }}
                  className={`w-full px-4 py-3 pr-12 rounded-xl border text-sm outline-none transition-all
                    ${errors.confirm ? "border-red-400 bg-red-50" : "border-gray-200 bg-white focus:border-blue-500"}
                  `}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirm && <p className="text-xs text-red-500">{errors.confirm}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors mt-2 shadow-md shadow-blue-200"
            >
              {t("auth.resetConfirm")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
