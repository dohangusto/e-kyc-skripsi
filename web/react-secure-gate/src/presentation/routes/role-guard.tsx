import type { ReactNode } from "react";
import { useRole } from "@/presentation/components/role-context";
import type { Role } from "@/domain/types";
import { NotAuthorizedPage } from "@/presentation/pages/not-authorized-page";

type RoleGuardProps = {
  allow: Role[];
  children: ReactNode;
};

export const RoleGuard = ({ allow, children }: RoleGuardProps) => {
  const { role } = useRole();

  if (!allow.includes(role)) {
    return <NotAuthorizedPage />;
  }

  return <>{children}</>;
};
