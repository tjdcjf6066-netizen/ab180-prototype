import type { ReactNode } from "react";

// spec_screens.md 3-5 "종료됨" · "커스텀"
export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-4 bg-bg-muted px-6 text-tag font-medium text-text-secondary">
      {children}
    </span>
  );
}
