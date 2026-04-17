import React, { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@features/language/model/context";
import { useAuth } from "@features/auth/model/context";
import logoImg from "@/assets/logo.png";

const QamqorLogo = () => (
  <div className="flex flex-col items-center gap-1 mb-6">
    <img src={logoImg} alt="Qamqor" className="w-20 h-20 object-contain" />
  </div>
);

export default function ForgotPasswordPage() {
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  const { checkUserExists, setFlow, setResetTarget } = useAuth();

  const [credential, setCredential] = useState("");
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateCredential = (value: string): string => {
    if (!value.trim()) return t("auth.required");
    const isPhone = value.startsWith("+7");
    if (isPhone) {
      if (value.length < 12) return t("auth.phoneInvalid");
    } else {
      if (!emailRegex.test(value)) return t("auth.emailInvalid");
    }
    return "";
  };

  const handlePhoneInput = (val: string) => {
    if (val.startsWith("+7") || val === "+" || val === "") {
      if (val.startsWith("+7")) {
        val = "+7" + val.slice(2).replace(/\D/g, "");
        if (val.length > 12) return;
      }
      setCredential(val);
    } else {
      setCredential(val);
    }
    setError("");
    setSubmitError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateCredential(credential);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!checkUserExists(credential)) {
      setSubmitError(t("auth.userNotFound"));
      return;
    }
    setResetTarget(credential);
    setFlow("forgot");
    navigate("/auth/verify");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="p-4 sm:p-6">
        <button
          onClick={() => navigate("/auth?tab=login")}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("auth.back")}
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">
          <QamqorLogo />

          <h1 className="text-2xl font-bold text-gray-900 mb-8 text-center">{t("auth.forgotTitle")}</h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">{t("auth.enterCredential")}</label>
              <input
                type="text"
                placeholder={t("auth.credentialPlaceholder")}
                value={credential}
                onChange={(e) => handlePhoneInput(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all
                  ${error ? "border-red-400 bg-red-50 focus:border-red-500" : "border-gray-200 bg-white focus:border-blue-500"}
                `}
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>

            {submitError && (
              <p className="text-sm text-red-500 text-center bg-red-50 rounded-lg py-2 px-4">{submitError}</p>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors mt-2 shadow-md shadow-blue-200"
            >
              {t("auth.resetPasswordBtn")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
