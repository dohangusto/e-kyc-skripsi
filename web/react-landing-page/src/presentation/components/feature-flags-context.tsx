import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { FeatureFlags } from "@/shared/types/featureFlags";
import { defaultFeatureFlags } from "@/shared/types/featureFlags";

const STORAGE_KEY = "rsg.featureFlags";

type FeatureFlagsContextValue = {
  flags: FeatureFlags;
  setFlag: (name: keyof FeatureFlags, value: boolean) => void;
  resetDefaults: () => void;
};

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | undefined>(
  undefined,
);

const loadFlags = (): FeatureFlags => {
  if (typeof window === "undefined") return defaultFeatureFlags;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultFeatureFlags;
  try {
    const parsed = JSON.parse(raw) as Partial<FeatureFlags>;
    return { ...defaultFeatureFlags, ...parsed };
  } catch {
    return defaultFeatureFlags;
  }
};

const saveFlags = (flags: FeatureFlags) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
};

export const FeatureFlagsProvider = ({ children }: { children: ReactNode }) => {
  const [flags, setFlags] = useState<FeatureFlags>(() => loadFlags());

  const setFlag = (name: keyof FeatureFlags, value: boolean) => {
    setFlags((prev) => {
      const next = { ...prev, [name]: value };
      saveFlags(next);
      return next;
    });
  };

  const resetDefaults = () => {
    setFlags(defaultFeatureFlags);
    saveFlags(defaultFeatureFlags);
  };

  const value = useMemo(
    () => ({
      flags,
      setFlag,
      resetDefaults,
    }),
    [flags],
  );

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};

export const useFeatureFlags = () => {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error("useFeatureFlags must be used within FeatureFlagsProvider");
  }
  return context;
};
