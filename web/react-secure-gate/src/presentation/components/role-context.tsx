import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Role } from "@/domain/types";

type RoleContextValue = {
  role: Role;
  setRole: (role: Role) => void;
  actorName: string;
};

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<Role>("VERIFIER");
  const actorName = role === "VERIFIER" ? "Verifier 1" : "Supervisor 1";

  const value = useMemo(
    () => ({ role, setRole, actorName }),
    [role, actorName],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within RoleProvider");
  }
  return context;
};
