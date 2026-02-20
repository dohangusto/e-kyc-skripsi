import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { Role } from "@/domain/types";

type RoleContextValue = {
  role: Role;
  actorName: string;
  userNik?: string;
  isAuthenticated: boolean;
  isLocked: boolean;
  login: (nik: string, password: string) => boolean;
  logout: () => void;
  lockPage: (password: string) => boolean;
  unlockPage: (password: string) => boolean;
};

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

const resolveRole = (nik: string): Role => {
  const normalized = nik.trim().toUpperCase();
  if (normalized.startsWith("9") || normalized.startsWith("S")) {
    return "SUPERVISOR";
  }
  return "VERIFIER";
};

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<Role>("VERIFIER");
  const [userNik, setUserNik] = useState<string | undefined>(undefined);
  const [userPassword, setUserPassword] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const actorName = userNik
    ? `${role === "VERIFIER" ? "Verifier" : "Supervisor"} ${userNik}`
    : role === "VERIFIER"
      ? "Verifier 1"
      : "Supervisor 1";

  const login = (nik: string, password: string) => {
    if (!nik.trim() || !password.trim()) return false;
    const nextRole = resolveRole(nik);
    setRole(nextRole);
    setUserNik(nik.trim());
    setUserPassword(password.trim());
    setIsAuthenticated(true);
    setIsLocked(false);
    return true;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setIsLocked(false);
    setUserNik(undefined);
    setUserPassword("");
    setRole("VERIFIER");
  };

  const lockPage = (password: string) => {
    if (!isAuthenticated) return false;
    if (password.trim() !== userPassword) return false;
    setIsLocked(true);
    return true;
  };

  const unlockPage = (password: string) => {
    if (!isAuthenticated) return false;
    if (password.trim() !== userPassword) return false;
    setIsLocked(false);
    return true;
  };

  return (
    <RoleContext.Provider
      value={{
        role,
        actorName,
        userNik,
        isAuthenticated,
        isLocked,
        login,
        logout,
        lockPage,
        unlockPage,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within RoleProvider");
  }
  return context;
};
