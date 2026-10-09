"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

// spec_screens.md 7-5. 범위 밖 항목을 누르면 이동하지 않고 이 팝업만 띄운다(수정 중 입력 유지).
const NotReadyContext = createContext<() => void>(() => {});

export function useNotReady() {
  return useContext(NotReadyContext);
}

export function NotReadyProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const show = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  return (
    <NotReadyContext.Provider value={show}>
      {children}
      <Dialog
        open={open}
        onClose={close}
        width={640}
        title="준비되지 않은 화면입니다"
        actions={<Button onClick={close}>확인</Button>}
      >
        <p>이 프로토타입은 기여 규칙의 설치 탭과 인앱이벤트 탭(설치)만 다룹니다.</p>
        <p className="mt-4 text-text-secondary">
          딥링크 실행 · 딥링크 페이지뷰, 다른 메뉴와 기능은 이번 과제 범위에 포함되지 않습니다.
        </p>
      </Dialog>
    </NotReadyContext.Provider>
  );
}
