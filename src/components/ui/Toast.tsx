"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import InfoIcon from "@mui/icons-material/Info";

const TOAST_MS = 3000;

// spec_screens.md 3-7 토스트 — 오른쪽 위(상단 내비게이션 아래), 어두운 배경, 3초 뒤 사라짐
export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, TOAST_MS);
    return () => clearTimeout(t);
  }, [message, onDone]);

  if (!message) return null;
  return createPortal(
    <div
      role="status"
      className="fixed top-94 right-24 z-40 flex items-center gap-8 rounded-8 bg-text-primary px-20 py-12 text-body font-medium text-white shadow-dropdown"
    >
      <InfoIcon className="text-text-placeholder" style={{ fontSize: 18 }} />
      {message}
    </div>,
    document.body,
  );
}
