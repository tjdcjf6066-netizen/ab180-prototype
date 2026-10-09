"use client";

import { useCallback, useRef, useState } from "react";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import { formatDuration, inherit, own, UNIT_LABEL, UNIT_OPTIONS, unitOption, type Tab } from "@/lib/duration";
import type { Cell, Duration, Unit } from "@/lib/types";
import { Popover } from "./Popover";
import { useOutsideClose } from "./useOutsideClose";

// spec_screens.md 3-1 값 입력(값 칸 110 + 단위 칸 90) · 3-2 값 드롭다운
type Props = {
  tab: Tab;
  cell: Cell;
  /** 화면에 보일 값. inherit이면 위 단계 값 */
  shown: Duration;
  /** 채널 · 캠페인 행만: "글로벌 값 따르기" · "{채널명} 값 따르기"와 그 위 단계 값 */
  follow?: { label: string; value: Duration };
  /** 광고 채널 정책 칸 */
  disabled?: boolean;
  onChange: (cell: Cell) => void;
};

const clamp = (tab: Tab, d: Duration): Duration => {
  const max = unitOption(tab, d.unit)?.max ?? 0;
  return { ...d, value: Math.min(d.value, max) };
};

export function DurationInput({ tab, cell, shown, follow, disabled, onChange }: Props) {
  const [menu, setMenu] = useState<"value" | "unit" | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  // 직접 입력한 값: Enter 또는 바깥을 눌러 닫을 때 적용
  const pending = useRef<Cell | null>(null);
  const close = useCallback(() => {
    if (pending.current) onChange(pending.current);
    pending.current = null;
    setMenu(null);
  }, [onChange]);
  useOutsideClose([boxRef, popRef], menu !== null, close);
  const toggle = (m: "value" | "unit") => {
    close();
    if (menu !== m) setMenu(m);
  };

  const ValueIcon = menu === "value" ? ExpandLessIcon : ExpandMoreIcon;

  if (disabled) {
    return (
      <div className="flex gap-8">
        <div className="flex h-38 w-110 items-center rounded-6 bg-bg-muted px-12 text-body text-text-placeholder">
          {shown.value}
        </div>
        <div className="flex h-38 w-90 items-center rounded-6 bg-bg-muted px-12 text-body text-text-placeholder">
          {UNIT_LABEL[shown.unit]}
        </div>
      </div>
    );
  }

  const setUnit = (unit: Unit) => {
    onChange(own(clamp(tab, { value: shown.value, unit })));
    close();
  };

  return (
    <div ref={boxRef} className="relative flex gap-8">
      <button
        type="button"
        onClick={() => toggle("value")}
        className={`flex h-38 w-110 items-center justify-between rounded-6 bg-white pr-8 pl-12 text-body ${
          menu === "value" ? "border-2 border-primary pl-11" : "border border-border"
        } text-text-primary`}
      >
        {shown.value}
        <ValueIcon className="text-icon-strong" style={{ fontSize: 18 }} />
      </button>
      <button
        type="button"
        onClick={() => toggle("unit")}
        className="flex h-38 w-90 items-center justify-between rounded-6 bg-bg-muted pr-8 pl-12 text-body text-text-primary"
      >
        {UNIT_LABEL[shown.unit]}
        <ExpandMoreIcon className="text-icon-strong" style={{ fontSize: 18 }} />
      </button>

      <Popover anchorRef={boxRef} popRef={popRef} open={menu === "value"}>
        <ValueMenu
          tab={tab}
          cell={cell}
          shown={shown}
          follow={follow}
          onTyped={(next) => (pending.current = next)}
          onPick={(next) => {
            pending.current = next;
            close();
          }}
        />
      </Popover>
      <Popover anchorRef={boxRef} popRef={popRef} open={menu === "unit"} offsetX={118}>
        <div className="w-90 rounded-8 border border-border bg-white py-6 shadow-dropdown">
          {UNIT_OPTIONS[tab].map((o) => (
            <button
              key={o.unit}
              type="button"
              onClick={() => setUnit(o.unit)}
              className={`block w-full px-12 py-6 text-left text-body hover:bg-bg-subtle ${
                o.unit === shown.unit ? "text-primary" : "text-text-primary"
              }`}
            >
              {UNIT_LABEL[o.unit]}
            </button>
          ))}
        </div>
      </Popover>
    </div>
  );
}

function ValueMenu({
  tab,
  cell,
  shown,
  follow,
  onTyped,
  onPick,
}: {
  tab: Tab;
  cell: Cell;
  shown: Duration;
  follow?: { label: string; value: Duration };
  onTyped: (cell: Cell | null) => void;
  onPick: (cell: Cell) => void;
}) {
  const option = unitOption(tab, shown.unit)!;
  const [text, setText] = useState("");
  const parse = (t: string) => (t.trim() === "" ? null : Number(t));
  const isValid = (n: number | null): n is number => n !== null && Number.isInteger(n) && n >= 0 && n <= option.max;
  const typed = parse(text);
  const invalid = typed !== null && !isValid(typed);
  const update = (t: string) => {
    setText(t);
    const n = parse(t);
    onTyped(isValid(n) ? own({ value: n, unit: shown.unit }) : null);
  };

  const step = (delta: number) => {
    const base = typed !== null && Number.isFinite(typed) ? typed : shown.value;
    update(String(Math.min(Math.max(Math.round(base) + delta, 0), option.max)));
  };
  const submit = () => {
    if (isValid(typed)) onPick(own({ value: typed, unit: shown.unit }));
  };
  const isCurrent = (v: number) => cell.mode === "own" && cell.duration.value === v;

  return (
    <div className="w-230 rounded-8 border border-border bg-white shadow-dropdown">
      <div className="p-12">
        <div
          className={`flex h-38 items-center gap-6 rounded-6 border-2 pr-4 pl-10 ${
            invalid ? "border-text-danger" : "border-primary"
          } shadow-focus`}
        >
          <SearchIcon className="text-text-placeholder" style={{ fontSize: 16 }} />
          <input
            autoFocus
            inputMode="numeric"
            value={text}
            onChange={(e) => update(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={`0 ~ ${option.max}`}
            className="w-full min-w-0 text-body outline-none placeholder:text-text-placeholder"
          />
          <span className="flex flex-col rounded-4 bg-bg-muted text-icon-strong">
            <button type="button" aria-label="1 올리기" onClick={() => step(1)} className="flex h-12">
              <ArrowDropUpIcon style={{ fontSize: 16 }} />
            </button>
            <button type="button" aria-label="1 내리기" onClick={() => step(-1)} className="flex h-12">
              <ArrowDropDownIcon style={{ fontSize: 16 }} />
            </button>
          </span>
        </div>
        {invalid && <p className="mt-8 text-caption text-text-danger">{`0~${option.max} 사이의 값을 입력해 주세요`}</p>}
      </div>

      {!invalid && (
        <>
          {follow && (
            <>
              <button
                type="button"
                onClick={() => onPick(inherit())}
                className="block w-full px-16 pb-8 text-left hover:bg-bg-subtle"
              >
                <span className={`block text-body ${cell.mode === "inherit" ? "text-primary" : "text-text-primary"}`}>
                  {follow.label}
                </span>
                <span className="block text-tag text-text-placeholder">현재 {formatDuration(follow.value)}</span>
              </button>
              <div className="h-1 bg-divider" />
            </>
          )}
          <div className="py-8">
            <div className="px-16 pb-4 text-body-sm text-text-secondary">All Values</div>
            {option.presets.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onPick(own({ value: v, unit: shown.unit }))}
                className={`block w-full px-16 py-6 text-left text-body hover:bg-bg-subtle ${
                  isCurrent(v) ? "text-primary" : "text-text-primary"
                }`}
              >
                {v === 0 ? (
                  <>
                    0 <span className="text-body-sm">(기여하지 않음)</span>
                  </>
                ) : (
                  v
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
