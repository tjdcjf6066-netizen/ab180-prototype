"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import CloseIcon from "@mui/icons-material/Close";

// spec_screens.md 3-7 확인 팝업 틀(나가기 · 삭제 · 안내).
// 배경 Dim은 내비게이션까지 화면 전체를 덮는다. ✕는 팝업 바깥 오른쪽 위(흰색).
type Props = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  /** 버튼 영역. 버튼은 같은 너비로 나눈다. */
  actions: ReactNode;
  width?: 800 | 640;
};

export function Dialog({ open, onClose, title, children, actions, width = 800 }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={`relative rounded-12 bg-white ${width === 800 ? "w-800" : "w-640"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="absolute right-0 bottom-full mb-8 text-white"
        >
          <CloseIcon style={{ fontSize: 32 }} />
        </button>
        <h2 className="px-32 py-20 text-modal-title-sm font-medium">{title}</h2>
        <div className="h-1 bg-divider" />
        <div className="px-32 pt-24 text-sub-tab">{children}</div>
        <div className="flex gap-12 px-32 pt-32 pb-32 [&>*]:h-48 [&>*]:flex-1">{actions}</div>
      </div>
    </div>,
    document.body,
  );
}
