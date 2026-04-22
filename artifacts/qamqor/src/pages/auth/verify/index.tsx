import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@features/language/model/context";
import { useAuth } from "@features/auth/model/context";

import logoImg from "@/assets/services/logo.png";

const QamqorLogo = () => (
  <div className="flex flex-col items-center gap-1 mb-6">
    <img src={logoImg} alt="Qamqor Logo" className="h-16 w-auto object-contain" />
    <span className="text-blue-700 font-bold text-xs tracking-[0.2em] uppercase">QAMQOR</span>
  </div>
);

export default function SmsVerifyPage() {
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  const { flow, verifyOtp, sendOtp, pendingEmail } = useAuth();

  const [digits, setDigits] = useState(() => {
    const dev = sessionStorage.getItem('dev_otp');
    if (dev && dev.length === 4) return dev.split('');
    return ["", "", "", ""];
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [canResend, setCanResend] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setError("");
    if (digit && index < 3) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    const newDigits = ["", "", "", ""];
    for (let i = 0; i < text.length; i++) newDigits[i] = text[i];
    setDigits(newDigits);
    const nextEmpty = newDigits.findIndex((d) => !d);
    inputs.current[nextEmpty === -1 ? 3 : nextEmpty]?.focus();
  };

  const handleConfirm = async () => {
    const code = digits.join("");
    if (code.length < 4) {
      setError(t("auth.required"));
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(code);
      sessionStorage.removeItem('dev_otp');
      if (flow === "forgot") {
        navigate("/auth/reset");
      } else {
        navigate("/dashboard");
      }
    } catch {
      setError(t("auth.invalidCode"));
      setDigits(["", "", "", ""]);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pendingEmail) return;
    setSecondsLeft(120);
    setCanResend(false);
    setDigits(["", "", "", ""]);
    setError("");
    inputs.current[0]?.focus();
    await sendOtp(pendingEmail);
  };

  const backPath = flow === "forgot" ? "/auth/forgot" : "/auth?tab=register";

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="p-4 sm:p-6">
        <button
          onClick={() => navigate(backPath)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("auth.back")}
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md text-center">
          <QamqorLogo />

          <h1 className="text-2xl font-bold text-gray-900 mb-4">Подтверждение почты</h1>
          <p className="text-gray-500 text-sm mb-2">
            Мы отправили письмо с кодом на вашу электронную почту.
          </p>
          {pendingEmail && (
            <p className="text-blue-600 text-sm font-medium mb-8">{pendingEmail}</p>
          )}

          <div className="flex justify-center gap-3 mb-8">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                disabled={loading}
                className={`w-14 h-14 text-center text-lg font-semibold rounded-2xl border-2 outline-none transition-all
                  ${error ? "border-red-400 bg-red-50" : digit ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white focus:border-blue-500"}
                  ${loading ? "opacity-50 cursor-not-allowed" : ""}
                `}
                aria-label={`Цифра ${i + 1}`}
              />
            ))}
          </div>

          {error && (
            <p className="text-sm text-red-500 mb-4">{error}</p>
          )}

          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors shadow-md shadow-blue-200 mb-6"
          >
            {loading ? "Проверяем..." : t("auth.confirm")}
          </button>

          <div className="flex items-center justify-center gap-2 text-sm">
            {canResend ? (
              <button
                onClick={handleResend}
                className="text-blue-600 hover:text-blue-800 underline font-medium"
              >
                {t("auth.noCode")}
              </button>
            ) : (
              <span className="text-gray-500">
                <span className="underline text-gray-500">{t("auth.noCode")}</span>{" "}
                <span className="font-medium text-blue-600">{formatTime(secondsLeft)}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}