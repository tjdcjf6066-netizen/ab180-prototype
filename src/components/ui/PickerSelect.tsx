"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import { useOutsideClose } from "./useOutsideClose";

// 새 채널 · 캠페인 행의 선택창 — spec_screens.md 4-7 · 와이어프레임 W2-D · W2-F · W2-F2
export type PickerGroup<T> = { title: string; items: T[] };

type Props<T> = {
  placeholder: string;
  searchPlaceholder: string;
  groups: PickerGroup<T>[];
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  renderExtra?: (item: T) => ReactNode;
  /** 고를 항목이 하나도 없을 때 */
  empty: ReactNode;
  /** 검색어와 일치하는 항목이 없을 때 */
  noMatch: (query: string) => ReactNode;
  onPick: (item: T) => void;
  defaultOpen?: boolean;
};

export function PickerSelect<T>({
  placeholder,
  searchPlaceholder,
  groups,
  getKey,
  getLabel,
  renderExtra,
  empty,
  noMatch,
  onPick,
  defaultOpen = false,
}: Props<T>) {
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useOutsideClose(boxRef, open, close);

  const q = query.trim().toLowerCase();
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const filtered = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => getLabel(i).toLowerCase().includes(q)) }))
    .filter((g) => g.items.length > 0);
  const Icon = open ? ExpandLessIcon : ExpandMoreIcon;

  return (
    <div ref={boxRef} className="relative w-full min-w-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex h-38 w-full items-center justify-between rounded-6 bg-white pr-8 pl-12 text-body text-text-placeholder ${
          open ? "border-2 border-primary pl-11" : "border border-border"
        }`}
      >
        <span className="truncate">{placeholder}</span>
        <Icon className="shrink-0 text-icon-strong" style={{ fontSize: 18 }} />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-30 mt-4 w-330 rounded-8 border border-border bg-white shadow-dropdown">
          <div className="p-12">
            <div className="flex h-38 items-center gap-6 rounded-6 border-2 border-primary px-10 shadow-focus">
              <SearchIcon className="text-text-placeholder" style={{ fontSize: 16 }} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full min-w-0 text-body-sm outline-none placeholder:text-text-placeholder"
              />
            </div>
          </div>
          <div className="max-h-260 overflow-auto pb-8">
            {total === 0 ? (
              <div className="px-16 pb-8">{empty}</div>
            ) : filtered.length === 0 ? (
              <div className="px-16 pb-8 text-body-sm text-text-primary">{noMatch(query.trim())}</div>
            ) : (
              filtered.map((g) => (
                <div key={g.title}>
                  <div className="px-16 py-4 text-body-sm text-text-secondary">{g.title}</div>
                  {g.items.map((item) => (
                    <button
                      key={getKey(item)}
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        onPick(item);
                      }}
                      className="flex w-full items-center gap-6 px-16 py-8 text-left text-body hover:bg-bg-subtle"
                    >
                      {getLabel(item)}
                      {renderExtra?.(item)}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
