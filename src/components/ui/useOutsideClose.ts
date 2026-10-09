import { useEffect, type RefObject } from "react";

// 열려 있는 드롭다운 바깥을 누르거나 Esc를 누르면 닫는다. refs: 안쪽으로 볼 영역(기준 요소 · 포털 드롭다운)
export function useOutsideClose(
  refs: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[],
  open: boolean,
  onClose: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const list = Array.isArray(refs) ? refs : [refs];
      if (!list.some((r) => r.current?.contains(e.target as Node))) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [refs, open, onClose]);
}
