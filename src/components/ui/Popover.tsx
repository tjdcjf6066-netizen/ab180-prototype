"use client";

import { useLayoutEffect, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

// 드롭다운을 body에 띄워 스크롤 영역(팝업 목록 등)에 잘리지 않게 한다. 기준 요소 바로 아래(4px)에 붙는다.
export function Popover({
  anchorRef,
  popRef,
  open,
  offsetX = 0,
  children,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  popRef: RefObject<HTMLDivElement | null>;
  open: boolean;
  offsetX?: number;
  children: ReactNode;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 4, left: r.left + offsetX });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, anchorRef, offsetX]);

  if (!open || !pos) return null;
  return createPortal(
    <div ref={popRef} className="fixed z-60" style={{ top: pos.top, left: pos.left }}>
      {children}
    </div>,
    document.body,
  );
}
