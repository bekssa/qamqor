import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@shared/ui/tooltip";
import { Toaster } from "@shared/ui/toaster";
import { AccessibilityProvider } from "@features/accessibility/model/context";
import { LanguageProvider } from "@features/language/model/context";
import { AuthProvider } from "@features/auth/model/context";

const queryClient = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AccessibilityProvider>
          <LanguageProvider>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </LanguageProvider>
        </AccessibilityProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
