import type { ReactNode } from "react";

export function PageIntro({ children }: { children: ReactNode }) {
  return (
    <section className="text-sm text-[var(--muted-gray)]">{children}</section>
  );
}
