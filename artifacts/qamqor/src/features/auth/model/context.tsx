import { createContext, useContext, useState, useRef, ReactNode } from "react";
import { flushSync } from "react-dom";
import { api } from "@shared/api";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  birthDate?: string;
  city?: string;
  avatarUrl?: string;
  rating?: number;
  categories?: string[];
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

const USER_KEY = "qamqor-user";
const TOKEN_KEY = "qamqor-token";

interface AuthContextType {
  currentUser: User | null;
  pendingUser: PendingUser | null;
  pendingEmail: string | null;
  flow: AuthFlow;
  resetTarget: string | null;

  setPendingUser: (user: PendingUser | null) => void;
  setFlow: (flow: AuthFlow) => void;
  setResetTarget: (target: string | null) => void;

  sendOtp: (email: string) => Promise<boolean>;
  verifyOtp: (code: string) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;

  checkUserExists: (credential: string) => boolean;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  deleteAvatar: () => Promise<void>;
  updateCategories: (keys: string[]) => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [pendingUser, setPendingUserState] = useState<PendingUser | null>(null);
  const pendingUserRef = useRef<PendingUser | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [flow, setFlow] = useState<AuthFlow>(null);
  const [resetTarget, setResetTarget] = useState<string | null>(null);

  const setPendingUser = (user: PendingUser | null) => {
    setPendingUserState(user);
    pendingUserRef.current = user;
    if (user) setPendingEmail(user.email);
  };

  const sendOtp = async (email: string): Promise<boolean> => {
    try {
      await api.sendOtp(email);
      setPendingEmail(email);
      return true;
    } catch (e) {
      console.error("sendOtp failed:", e);
      return false;
    }
  };

  const verifyOtp = async (code: string): Promise<void> => {
    const email = pendingEmail;
    if (!email) throw new Error("No pending email");

    const reg = pendingUserRef.current ?? pendingUser;
    const password = reg?.password;
    const { user: backendUser, token } = await api.verifyOtp(email, code, password, reg ? {
      firstName: reg.firstName,
      lastName: reg.lastName,
      phone: reg.phone,
      role: reg.role,
      birthDate: reg.birthDate,
      city: reg.city,
    } : undefined);

    // Merge registration form data with backend response
    const authUser: User = {
      id: backendUser.id,
      email: backendUser.email || email,
      firstName: reg?.firstName || backendUser.name || email,
      lastName: reg?.lastName || "",
      phone: reg?.phone || backendUser.phone || "",
      role: reg
        ? reg.role === "offer-help" ? "volunteer" : "elderly"
        : backendUser.role || "elderly",
      birthDate: reg?.birthDate,
      city: reg?.city,
      avatarUrl: backendUser.avatarUrl,
      rating: backendUser.rating,
      categories: (backendUser as any).categories ?? [],
    };

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(authUser));
    flushSync(() => {
      setCurrentUser(authUser);
      setPendingUserState(null);
      setPendingEmail(null);
      setFlow(null);
    });
    pendingUserRef.current = null;
  };

  const loginWithPassword = async (email: string, password: string): Promise<void> => {
    const { user: backendUser, token } = await api.loginWithPassword(email, password);

    const authUser: User = {
      id: backendUser.id,
      email: backendUser.email,
      firstName: (backendUser as any).firstName || backendUser.name || backendUser.email,
      lastName: (backendUser as any).lastName || "",
      phone: backendUser.phone || "",
      city: (backendUser as any).city,
      birthDate: (backendUser as any).birthDate,
      role: (backendUser.role as User['role']) || "elderly",
      avatarUrl: backendUser.avatarUrl,
      rating: backendUser.rating,
      categories: (backendUser as any).categories ?? [],
    };

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(authUser));
    flushSync(() => {
      setCurrentUser(authUser);
    });
  };

  const updatePassword = async (password: string): Promise<void> => {
    await api.updatePassword(password);
  };

  const updateProfile = async (updates: Partial<User>): Promise<void> => {
    if (!currentUser) return;
    try {
      const roleForApi = updates.role === 'volunteer' ? 'offer-help'
        : updates.role === 'elderly' ? 'seek-help'
        : updates.role;
      const { user: backendUser } = await api.updateUserProfile({
        firstName: updates.firstName,
        lastName: updates.lastName,
        phone: updates.phone,
        city: updates.city,
        role: roleForApi,
      });
      setCurrentUser(prev => {
        if (!prev) return prev;
        const merged: User = {
          ...prev,
          ...updates,
          firstName: backendUser.firstName ?? updates.firstName ?? prev.firstName,
          lastName: backendUser.lastName ?? updates.lastName ?? prev.lastName,
          phone: backendUser.phone ?? updates.phone ?? prev.phone,
          city: (backendUser as any).city ?? updates.city ?? prev.city,
          role: (backendUser.role as User['role']) ?? updates.role ?? prev.role,
          avatarUrl: backendUser.avatarUrl ?? prev.avatarUrl,
        };
        localStorage.setItem(USER_KEY, JSON.stringify(merged));
        return merged;
      });
    } catch (e) {
      console.error('updateProfile failed:', e);
      throw e;
    }
  };

  const uploadAvatar = async (file: File): Promise<void> => {
    if (!currentUser) return;
    try {
      const { user: backendUser } = await api.uploadAvatar(file);
      setCurrentUser(prev => {
        if (!prev) return prev;
        const merged: User = { ...prev, avatarUrl: backendUser.avatarUrl ?? prev.avatarUrl };
        localStorage.setItem(USER_KEY, JSON.stringify(merged));
        return merged;
      });
    } catch (e) {
      console.error('uploadAvatar failed:', e);
      throw e;
    }
  };

  const deleteAvatar = async (): Promise<void> => {
    if (!currentUser) return;
    const { user: backendUser } = await api.deleteAvatar();
    setCurrentUser(prev => {
      if (!prev) return prev;
      const merged = { ...prev, avatarUrl: backendUser.avatarUrl ?? undefined };
      localStorage.setItem(USER_KEY, JSON.stringify(merged));
      return merged;
    });
  };

  const updateCategories = async (keys: string[]): Promise<void> => {
    if (!currentUser) return;
    const { user: backendUser } = await api.updateUserCategories(keys);
    setCurrentUser(prev => {
      if (!prev) return prev;
      const merged = { ...prev, categories: (backendUser as any).categories ?? keys };
      localStorage.setItem(USER_KEY, JSON.stringify(merged));
      return merged;
    });
  };

  const deleteAccount = async (): Promise<void> => {
    await api.deleteAccount();
    setCurrentUser(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  };

  const refreshProfile = async (): Promise<void> => {
    if (!currentUser) return;
    try {
      const { user: backendUser } = await api.getMe();
      setCurrentUser(prev => {
        if (!prev) return prev;
        const merged: User = {
          ...prev,
          firstName: (backendUser as any).firstName ?? prev.firstName,
          lastName: (backendUser as any).lastName ?? prev.lastName,
          phone: backendUser.phone ?? prev.phone,
          city: (backendUser as any).city ?? prev.city,
          birthDate: (backendUser as any).birthDate ?? prev.birthDate,
          role: (backendUser.role as User['role']) ?? prev.role,
          avatarUrl: backendUser.avatarUrl ?? prev.avatarUrl,
          categories: (backendUser as any).categories ?? prev.categories,
        };
        localStorage.setItem(USER_KEY, JSON.stringify(merged));
        return merged;
      });
    } catch (e) {
      console.error('refreshProfile failed:', e);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  };

  // Backend handles email existence; always return true to avoid blocking the flow
  const checkUserExists = (_credential: string): boolean => true;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        pendingUser,
        pendingEmail,
        flow,
        resetTarget,
        setPendingUser,
        setFlow,
        setResetTarget,
        sendOtp,
        verifyOtp,
        loginWithPassword,
        updatePassword,
        checkUserExists,
        updateProfile,
        uploadAvatar,
        deleteAvatar,
        updateCategories,
        deleteAccount,
        refreshProfile,
        logout,
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