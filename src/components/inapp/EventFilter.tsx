"use client";

import { useCallback, useRef, useState } from "react";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import { Tag } from "@/components/ui/Tag";
import { useOutsideClose } from "@/components/ui/useOutsideClose";
import { formatDuration } from "@/lib/duration";
import { EVENT_BY_ID } from "@/lib/mock/catalog";
import type { Duration, InAppEventSetting } from "@/lib/types";

// spec_screens.md 5-2 인앱 이벤트 필터 · 와이어프레임 W3-A · W3-L · W3-O. 너비 360 고정.
type Props = {
  events: InAppEventSetting[]; // 최근 등록순
  value: string | null;
  onChange: (eventId: string | null) => void;
  disabled?: boolean;
};

function DurationText({ d }: { d: Duration }) {
  return d.value === 0 ? <span className="text-text-placeholder">기여하지 않음</span> : <span className="text-primary">{formatDuration(d)}</span>;
}

export function EventFilter({ events, value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);
  useOutsideClose(boxRef, open, close);

  const selected = value ? events.find((e) => e.eventId === value) : undefined;
  const q = query.trim().toLowerCase();
  const listed = events.filter((e) => (EVENT_BY_ID.get(e.eventId)?.name ?? "").toLowerCase().includes(q));
  const pick = (id: string | null) => {
    onChange(id);
    close();
  };
  const Icon = open ? ExpandLessIcon : ExpandMoreIcon;

  return (
    <div ref={boxRef} className="relative w-360">
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
        className={`flex h-38 w-full items-center justify-between rounded-6 bg-white pr-8 pl-12 text-body ${
          open ? "border-2 border-primary pl-11" : "border border-border"
        }`}
      >
        {selected ? (
          <span className="flex items-center gap-8 truncate">
            {EVENT_BY_ID.get(selected.eventId)?.name}
            <DurationText d={selected.duration} />
          </span>
        ) : (
          <span className="text-text-placeholder">선택하지 않음</span>
        )}
        <Icon className="shrink-0 text-icon-strong" style={{ fontSize: 18 }} />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-30 mt-4 w-360 rounded-8 border border-border bg-white shadow-dropdown">
          <div className="p-12 pb-8">
            <div className="flex h-36 items-center gap-6 rounded-6 border border-border px-10">
              <SearchIcon className="text-text-placeholder" style={{ fontSize: 16 }} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="인앱 이벤트 검색"
                className="w-full min-w-0 text-body-sm outline-none placeholder:text-text-placeholder"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => pick(null)}
            className={`flex w-full items-center justify-between px-16 py-8 text-left text-body hover:bg-bg-subtle ${
              value === null ? "bg-primary-weak text-primary" : ""
            }`}
          >
            선택하지 않음
            <span className="text-caption text-text-placeholder">채널 · 캠페인 기간 기준</span>
          </button>
          <div className="mt-4 h-1 bg-divider" />
          {events.length === 0 ? (
            <p className="px-16 py-12 text-body-sm text-text-placeholder">기간을 설정한 인앱 이벤트가 없습니다.</p>
          ) : (
            <>
              <div className="px-16 pt-8 pb-4 text-caption text-text-placeholder">
                기간을 설정한 인앱 이벤트 {events.length}개 · 최근 등록순
              </div>
              {/* 목록만 스크롤 */}
              <div className="max-h-260 overflow-auto pb-6">
                {listed.map((e) => {
                  const ev = EVENT_BY_ID.get(e.eventId);
                  return (
                    <button
                      key={e.eventId}
                      type="button"
                      onClick={() => pick(e.eventId)}
                      className={`flex w-full items-center justify-between gap-8 px-16 py-8 text-left text-body hover:bg-bg-subtle ${
                        value === e.eventId ? "bg-primary-weak" : ""
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-6">
                        <span className="truncate">{ev?.name}</span>
                        {ev?.kind === "custom" && <Tag>커스텀</Tag>}
                      </span>
                      <span className="shrink-0 text-body-sm text-text-secondary">{formatDuration(e.duration)}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
