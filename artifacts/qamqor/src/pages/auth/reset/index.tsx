import React, { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Eye, EyeOff, CheckCircle } from "lucide-react";
import { useLanguage } from "@features/language/model/context";
import { useAuth } from "@features/auth/model/context";

import logoImg from "@/assets/services/logo.png";

const QamqorLogo = () => (
  <div className="flex flex-col items-center gap-1 mb-6">
    <img src={logoImg} alt="Qamqor Logo" className="h-16 w-auto object-contain" />
    <span className="text-blue-700 font-bold text-xs tracking-[0.2em] uppercase">QAMQOR</span>
  </div>
);

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  const { setFlow, setResetTarget, updatePassword } = useAuth();

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

  const [submitError, setSubmitError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    
    try {
      await updatePassword(password);
      setSuccess(true);
      setFlow(null);
      setResetTarget(null);
      setTimeout(() => navigate("/auth?tab=login"), 2000);
    } catch (e) {
      setSubmitError("Не удалось обновить пароль. Попробуйте позже.");
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-10 sm:p-12">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Пароль изменен</h2>
          <p className="text-gray-500 text-sm mb-10">Ваш пароль успешно изменен</p>
          
          <div className="flex justify-center mb-10 text-blue-600">
             <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
               {/* Lock Body */}
               <rect x="5" y="10" width="14" height="11" rx="2" ry="2"></rect>
               {/* Lock Handle */}
               <path d="M7 10V7a5 5 0 0 1 10 0v3"></path>
               
               {/* The *** inside the lock body */}
               {/* Left * */}
               <path d="M8.5 14v3 M7.5 15h2 M7.5 16l2-2 M9.5 16l-2-2"></path>
               {/* Middle * */}
               <path d="M12 14v3 M11 15h2 M11 16l2-2 M13 16l-2-2"></path>
               {/* Right * */}
               <path d="M15.5 14v3 M14.5 15h2 M14.5 16l2-2 M16.5 16l-2-2"></path>
             </svg>
          </div>

          <button
            onClick={() => navigate("/auth?tab=login")}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-md shadow-blue-200"
          >
            Вернуться к входу
          </button>
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
                  placeholder="должно быть не менее 8 символов"
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
                  placeholder="должно быть не менее 8 символов"
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

            {submitError && (
              <p className="text-sm text-red-500 text-center bg-red-50 rounded-lg py-2 px-4">{submitError}</p>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors mt-2 shadow-md shadow-blue-200"
            >
              Подтвердить
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
