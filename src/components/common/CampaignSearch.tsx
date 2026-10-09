"use client";

import { useEffect, useRef, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { Tag } from "@/components/ui/Tag";
import { gwaWa } from "@/lib/chart";
import { CHANNEL_BY_ID } from "@/lib/mock/catalog";
import { searchCampaignSettings } from "@/lib/selectors";
import type { Campaign } from "@/lib/types";

// spec_screens.md 4-5 · 와이어프레임 W1-F. 목록은 거르지 않고 결과는 드롭다운에만.
type Props = {
  settings: { campaignId: string }[];
  includeEnded: boolean;
  onPick: (campaign: Campaign) => void;
};

export function CampaignSearch({ settings, includeEnded, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const results = searchCampaignSettings(settings, query, includeEnded);
  const active = results.filter((c) => c.status === "active");
  const ended = results.filter((c) => c.status === "ended");
  const q = query.trim();

  const pick = (campaign: Campaign) => {
    setQuery(campaign.name);
    setOpen(false);
    onPick(campaign);
  };

  return (
    <div ref={boxRef} className="relative w-280">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder="캠페인 검색"
        className="h-36 w-full rounded-6 border border-border bg-white pr-36 pl-12 text-body-sm outline-none placeholder:text-text-placeholder focus:border-2 focus:border-primary focus:pl-11"
      />
      {query && (
        <button
          type="button"
          aria-label="검색어 지우기"
          onClick={() => {
            setQuery("");
            setOpen(false);
          }}
          className="absolute top-1/2 right-10 flex -translate-y-1/2 text-text-placeholder"
        >
          <CloseIcon style={{ fontSize: 16 }} />
        </button>
      )}

      {open && q && (
        <div className="absolute top-full right-0 z-30 mt-4 max-h-320 w-full overflow-auto rounded-8 border border-border bg-white py-6 shadow-dropdown">
          {results.length === 0 ? (
            <div className="px-12 py-6">
              <p className="text-body-sm text-text-primary">
                {includeEnded ? "" : "진행 중인 캠페인 중 "}
                {`"${q}"${gwaWa(q)} 일치하는 결과가 없어요.`}
              </p>
              <p className="mt-4 text-caption text-text-secondary">
                {includeEnded ? "" : "종료된 캠페인도 찾으려면 '종료된 캠페인 포함'을 체크하세요. "}
                캠페인 한정 설정이 없는 캠페인은 속한 채널 값을 따릅니다.
              </p>
            </div>
          ) : (
            <>
              {active.length > 0 && <Group title="진행 중인 캠페인" items={active} query={q} onPick={pick} />}
              {active.length > 0 && ended.length > 0 && <div className="my-6 h-1 bg-divider" />}
              {ended.length > 0 && <Group title="종료된 캠페인" items={ended} query={q} onPick={pick} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Group({
  title,
  items,
  query,
  onPick,
}: {
  title: string;
  items: Campaign[];
  query: string;
  onPick: (c: Campaign) => void;
}) {
  return (
    <div>
      <div className="px-12 py-4 text-tag text-text-placeholder">{title}</div>
      {items.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onPick(c)}
          className="block w-full px-12 py-6 text-left hover:bg-bg-subtle"
        >
          <span className="flex items-center gap-6 text-body-sm">
            <Highlight text={c.name} query={query} />
            {c.status === "ended" && <Tag>종료됨</Tag>}
          </span>
          <span className="block text-tag text-text-placeholder">{CHANNEL_BY_ID.get(c.channelId)?.name}</span>
        </button>
      ))}
    </div>
  );
}

// 일치 부분 Bold
function Highlight({ text, query }: { text: string; query: string }) {
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, i)}
      <b className="font-bold">{text.slice(i, i + query.length)}</b>
      {text.slice(i + query.length)}
    </span>
  );
}
