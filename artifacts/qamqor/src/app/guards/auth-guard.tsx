import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@features/auth/model/context";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { currentUser } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!currentUser) {
      navigate("/auth");
    }
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  return <>{children}</>;
}
