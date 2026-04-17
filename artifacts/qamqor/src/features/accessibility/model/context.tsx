import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AccessibilityContextType {
  isHighContrast: boolean;
  toggleHighContrast: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [isHighContrast, setIsHighContrast] = useState(() => {
    return localStorage.getItem("qamqor-accessibility") === "high-contrast";
  });

  useEffect(() => {
    if (isHighContrast) {
      document.documentElement.style.fontSize = "22px";
      localStorage.setItem("qamqor-accessibility", "high-contrast");
    } else {
      document.documentElement.style.fontSize = "";
      localStorage.removeItem("qamqor-accessibility");
    }
  }, [isHighContrast]);

  const toggleHighContrast = () => setIsHighContrast((prev) => !prev);

  return (
    <AccessibilityContext.Provider value={{ isHighContrast, toggleHighContrast }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be used within AccessibilityProvider");
  return ctx;
}
