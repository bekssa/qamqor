import { createContext, useContext, useState, ReactNode } from "react";
import initialUsers from "@entities/user/api/mock-users.json";

export interface User {
  id: number;
  lastName: string;
  firstName: string;
  email: string;
  phone: string;
  role: string;
  birthDate?: string;
  city?: string;
}

export interface PendingUser {
  lastName: string;
  firstName: string;
  email: string;
  phone: string;
  role: string;
  password: string;
  birthDate?: string;
  city?: string;
}

export type AuthFlow = "register" | "forgot" | null;

interface AuthContextType {
  currentUser: User | null;
  pendingUser: PendingUser | null;
  flow: AuthFlow;
  resetTarget: string | null;
  setPendingUser: (user: PendingUser | null) => void;
  setFlow: (flow: AuthFlow) => void;
  setResetTarget: (target: string | null) => void;
  login: (credential: string, password: string) => boolean;
  confirmRegister: () => void;
  logout: () => void;
  checkUserExists: (credential: string) => boolean;
  updateProfile: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const MOCK_OTP_CODE = "1234";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<(User & { password: string })[]>(
    initialUsers as (User & { password: string })[]
  );
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("qamqor-user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [pendingUser, setPendingUserState] = useState<PendingUser | null>(null);
  const [flow, setFlow] = useState<AuthFlow>(null);
  const [resetTarget, setResetTarget] = useState<string | null>(null);

  const setPendingUser = (user: PendingUser | null) => {
    setPendingUserState(user);
  };

  const login = (credential: string, password: string): boolean => {
    const found = users.find(
      (u) =>
        (u.email === credential || u.phone === credential) &&
        u.password === password
    );
    if (found) {
      const { password: _pw, ...user } = found;
      setCurrentUser(user);
      localStorage.setItem("qamqor-user", JSON.stringify(user));
      return true;
    }
    return false;
  };

  const confirmRegister = () => {
    if (!pendingUser) return;
    const newUser: User & { password: string } = {
      id: users.length + 1,
      ...pendingUser,
    };
    setUsers((prev) => [...prev, newUser]);
    const { password: _pw, ...user } = newUser;
    setCurrentUser(user);
    localStorage.setItem("qamqor-user", JSON.stringify(user));
    setPendingUserState(null);
    setFlow(null);
  };

  const updateProfile = (updates: Partial<User>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);
    localStorage.setItem("qamqor-user", JSON.stringify(updated));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("qamqor-user");
  };

  const checkUserExists = (credential: string): boolean => {
    return users.some((u) => u.email === credential || u.phone === credential);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        pendingUser,
        flow,
        resetTarget,
        setPendingUser,
        setFlow,
        setResetTarget,
        login,
        confirmRegister,
        logout,
        checkUserExists,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
