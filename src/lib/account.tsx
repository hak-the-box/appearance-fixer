import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface AccountProfile {
  username: string;
  email: string;
  password: string;
}

const STORAGE_KEY = "odysseus.account.v1";

const defaultProfile: AccountProfile = {
  username: "admin",
  email: "admin@odysseus.local",
  password: "admin",
};

interface AccountContextValue {
  profile: AccountProfile;
  updateProfile: (patch: Partial<Pick<AccountProfile, "username" | "email">>) => void;
  changePassword: (current: string, next: string) => { ok: boolean; error?: string };
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<AccountProfile>(defaultProfile);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setProfile({ ...defaultProfile, ...JSON.parse(raw) });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch { /* ignore */ }
  }, [profile]);

  const value = useMemo<AccountContextValue>(() => ({
    profile,
    updateProfile: (patch) => setProfile((p) => ({ ...p, ...patch })),
    changePassword: (current, next) => {
      if (current !== profile.password) return { ok: false, error: "Current password is incorrect." };
      if (!next || next.length < 4) return { ok: false, error: "New password must be at least 4 characters." };
      setProfile((p) => ({ ...p, password: next }));
      return { ok: true };
    },
  }), [profile]);

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used inside <AccountProvider>");
  return ctx;
}
