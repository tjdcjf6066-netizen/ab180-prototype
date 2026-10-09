"use client";

import { useState, type ReactNode } from "react";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

// spec_screens.md 3-6 ⓘ 안내 툴팁. 툴팁 안의 링크를 누를 수 있도록 아이콘 · 툴팁 어느 쪽에 마우스가 있어도 열려 있다.
export function InfoTooltip({ children, size = 15 }: { children?: ReactNode; size?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={(e) => e.stopPropagation()}
    >
      <InfoOutlinedIcon className="text-icon" style={{ fontSize: size }} />
      {open && children && (
        <span className="absolute top-full left-0 z-30 pt-6">
          <span className="block w-max max-w-360 rounded-6 bg-tooltip-info px-12 py-10 text-body-sm font-regular text-text-primary shadow-dropdown">
            {children}
          </span>
        </span>
      )}
    </span>
  );
}
