import type { ReactNode } from "react";
import { NotReadyProvider } from "./NotReadyProvider";
import { SideNav } from "./SideNav";
import { TopNav } from "./TopNav";

// spec_screens.md 2장. 내비게이션은 고정, 세로 스크롤은 콘텐츠 영역만.
// 콘텐츠: 최대 1440(좌우 여백 70 → 실제 1300), 영역 가운데 정렬. 창이 좁으면 여백 32로 줄고
// 콘텐츠가 창 너비에 맞춰 줄어든다(운영 대시보드와 같음). 그보다 더 좁으면 가로 스크롤.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <NotReadyProvider>
      <div className="flex h-screen flex-col">
        <TopNav />
        <div className="flex min-h-0 flex-1">
          <SideNav />
          <main className="flex-1 overflow-auto">
            <div className="mx-auto w-full max-w-1440 min-w-1150 px-32 min-[1558px]:px-70">{children}</div>
          </main>
        </div>
      </div>
    </NotReadyProvider>
  );
}
