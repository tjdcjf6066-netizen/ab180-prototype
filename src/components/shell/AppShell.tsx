import type { ReactNode } from "react";
import { NotReadyProvider } from "./NotReadyProvider";
import { SideNav } from "./SideNav";
import { TopNav } from "./TopNav";

// spec_screens.md 2장. 내비게이션은 고정, 세로 스크롤은 콘텐츠 영역만.
// 콘텐츠는 반응형 아님: 고정 너비 1440(좌우 여백 70 → 실제 1300), 영역 가운데 정렬.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <NotReadyProvider>
      <div className="flex h-screen flex-col">
        <TopNav />
        <div className="flex min-h-0 flex-1">
          <SideNav />
          <main className="flex-1 overflow-auto">
            <div className="mx-auto w-1440 px-70">{children}</div>
          </main>
        </div>
      </div>
    </NotReadyProvider>
  );
}
