"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import EditIcon from "@mui/icons-material/Edit";
import PublicIcon from "@mui/icons-material/Public";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import { CampaignSearch } from "@/components/common/CampaignSearch";
import { EditMode, type EditConfig, type LeaveGuard } from "@/components/common/EditMode";
import { rowId, SettingsTable, type Selection } from "@/components/common/SettingsTable";
import { useNotReady } from "@/components/shell/NotReadyProvider";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { Toast } from "@/components/ui/Toast";
import { formatDuration } from "@/lib/duration";
import { inAppEditor } from "@/lib/edit";
import { CAMPAIGN_BY_ID, CHANNEL_BY_ID, EVENT_BY_ID } from "@/lib/mock/catalog";
import { inAppSaveNotice } from "@/lib/notice";
import { resolveInApp } from "@/lib/resolve";
import type { Campaign, Cell, Duration, InAppSettings } from "@/lib/types";
import { useSettings } from "@/state/SettingsProvider";
import { AttributionChart, type AttrRow } from "./AttributionChart";
import { EventFilter } from "./EventFilter";
import { EventPeriodDialog } from "./EventPeriodDialog";

// 인앱이벤트 탭 · 설치 하위 탭 — spec_screens.md 5장 · 와이어프레임 W3
const HIGHLIGHT_MS = 2000;
const SUB_TABS = ["설치", "딥링크 실행", "딥링크 페이지뷰"] as const;

// 수정 모드: 값 한 칸, 인앱이벤트 단위. 열: 이름 700 · 값 480 · 아이콘 120
const inAppEditConfig: EditConfig<InAppSettings, Duration, Cell> = {
  tab: "inApp",
  editor: inAppEditor,
  grid: "grid grid-cols-[700px_480px_120px]",
  keys: ["install"],
  headers: ["설치"],
  defaults: (s) => s.defaults,
  globalOf: (g) => g,
  withGlobal: (_g, _k, d) => d,
  cellOf: (c) => c,
  withCell: (_c, _k, cell) => cell,
  // spec_screens.md 5-6
  notice: (before, after) => {
    const n = inAppSaveNotice(before, after);
    if (!n) return null;
    if (n.kind === "events") {
      return {
        title: `기간을 별도로 설정한 인앱 이벤트 ${n.events}개에는 이번 변경이 반영되지 않습니다.`,
        body: "인앱 이벤트 설정이 채널 · 캠페인 기간보다 우선합니다.",
      };
    }
    if (n.events > 0) {
      return {
        title: `기여 기간을 별도로 설정한 인앱 이벤트 ${n.events}개 · 채널 ${n.channels}개(그 안의 캠페인 포함) · 캠페인 ${n.campaigns}개에는 반영되지 않습니다.`,
        body: "기여 기간을 별도로 설정한 인앱 이벤트 · 채널 · 캠페인을 제외한 모든 인앱 이벤트 · 채널 · 캠페인에 적용됩니다.",
      };
    }
    return {
      title: `기여 기간을 별도로 설정한 채널 ${n.channels}개(그 안의 캠페인 포함) · 캠페인 ${n.campaigns}개에는 반영되지 않습니다.`,
      body: "기여 기간을 별도로 설정한 채널 · 캠페인을 제외한 모든 채널 · 캠페인에 적용됩니다.",
    };
  },
};

// 선택한 행 → 차트 데이터와 위 단계 값(채널: 글로벌, 캠페인: 속한 채널)
function chartRow(s: InAppSettings, sel: Selection): { row: AttrRow; compare?: { name: string; duration: Duration } } {
  if (sel.kind === "global") return { row: { name: "글로벌", isGlobal: true, value: s.global } };
  const channelName = CHANNEL_BY_ID.get(sel.channelId)?.name ?? "";
  if (sel.kind === "channel") {
    return { row: { name: channelName, value: resolveInApp(s, undefined, sel.channelId) }, compare: { name: "글로벌", duration: s.global } };
  }
  return {
    row: {
      name: CAMPAIGN_BY_ID.get(sel.campaignId)?.name ?? "",
      channelName,
      value: resolveInApp(s, undefined, sel.channelId, sel.campaignId),
    },
    compare: { name: channelName, duration: resolveInApp(s, undefined, sel.channelId) },
  };
}

export function InAppTab({ guardRef }: { guardRef: MutableRefObject<LeaveGuard | null> }) {
  const { inApp, setInApp } = useSettings();
  const notReady = useNotReady();
  const [editing, setEditing] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>({ kind: "global" });
  const [includeEnded, setIncludeEnded] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [highlight, setHighlight] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const onIncludeEnded = (checked: boolean) => {
    setIncludeEnded(checked);
    if (!checked && selection.kind === "campaign" && CAMPAIGN_BY_ID.get(selection.campaignId)?.status === "ended") {
      setSelection({ kind: "channel", channelId: selection.channelId });
    }
  };

  const toggleExpand = (channelId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) next.delete(channelId);
      else next.add(channelId);
      return next;
    });

  const onPick = (campaign: Campaign) => {
    const sel: Selection = { kind: "campaign", channelId: campaign.channelId, campaignId: campaign.id };
    setExpanded((prev) => new Set(prev).add(campaign.channelId));
    setSelection(sel);
    const id = rowId(sel);
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    setHighlight(id);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setHighlight(null), HIGHLIGHT_MS);
  };

  const startEdit = () => {
    setEditing(true);
    if (includeEnded) setToast("수정 중에는 종료된 캠페인이 표시되지 않습니다.");
  };

  const onExit = useCallback(
    (saved: InAppSettings | null) => {
      setEditing(false);
      if (!saved) return;
      setInApp(saved);
      const exists =
        selection.kind === "global" ||
        (selection.kind === "channel" && saved.channels.some((c) => c.channelId === selection.channelId)) ||
        (selection.kind === "campaign" && saved.campaigns.some((c) => c.campaignId === selection.campaignId));
      if (!exists) setSelection({ kind: "global" });
    },
    [selection, setInApp],
  );

  const { row, compare } = chartRow(inApp, selection);
  const pickedEvent = eventId ? inApp.events.find((e) => e.eventId === eventId) : undefined;
  const event = pickedEvent && { name: EVENT_BY_ID.get(pickedEvent.eventId)?.name ?? "", duration: pickedEvent.duration };

  return (
    <div className="pb-70">
      <p className="text-body">
        타겟 이벤트인 설치, 딥링크 실행, 딥링크 페이지뷰에 대한 어트리뷰션 윈도우를 설정할 수 있습니다. 어트리뷰션 윈도우는
        타겟 이벤트 후에 발생한 전환인 인앱이벤트가 타겟 이벤트와 관련 있다고 판단되는 기간입니다. 이때 어떤 인앱이벤트가
        여러 타겟 이벤트의 어트리뷰션 윈도우에 있으면 가장 최근에 발생한 타겟 이벤트에 기여한 채널의 성과로 측정됩니다.
      </p>
      <button type="button" onClick={notReady} className="mt-6 flex items-center gap-4 text-caption text-text-secondary">
        <PublicIcon style={{ fontSize: 14 }} />
        가이드 보러가기
      </button>

      {/* 하위 탭: 설치만 동작. 딥링크 두 탭은 이동하지 않고 안내 팝업(입력 유지) */}
      <div className="mt-32 flex gap-8 border-b border-divider">
        {SUB_TABS.map((t, i) => (
          <button
            key={t}
            type="button"
            onClick={i === 0 ? undefined : notReady}
            className={`-mb-1 border-b-2 px-12 pt-6 pb-10 text-sub-tab ${
              i === 0 ? "border-primary font-medium text-primary" : "border-transparent font-regular text-text-secondary"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-24 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h2 className="text-section font-medium">설치에 대한 어트리뷰션 윈도우</h2>
          <InfoTooltip>이 기간에 있는 인앱이벤트는 설치 이벤트에 기여한 채널의 성과가 됩니다.</InfoTooltip>
        </div>
        {!editing && (
          <Button variant="outline" className="h-36 px-16" onClick={startEdit}>
            <EditIcon style={{ fontSize: 16 }} />
            수정
          </Button>
        )}
      </div>

      {/* 인앱 이벤트 레이어(5-2). 수정 중에는 Dim · 조작 불가 */}
      <div className="relative mt-16 rounded-8 bg-bg-subtle pt-16 pr-16 pb-16 pl-20">
        <div className="flex items-baseline gap-12">
          <span className="shrink-0 text-layer-title font-bold">
            인앱 이벤트별 기간 설정 <span className="text-primary">{inApp.events.length}개</span>
          </span>
          <span className="truncate text-body-sm text-text-secondary">
            설정한 인앱 이벤트는 캠페인 · 채널 · 글로벌보다 우선합니다. 설정하지 않은 인앱 이벤트는 캠페인 → 채널 → 글로벌 순으로
            따릅니다.
          </span>
        </div>
        <div className="mt-10 flex items-center gap-8">
          <EventFilter events={inApp.events} value={eventId} onChange={setEventId} disabled={editing} />
          <Button variant="outline" className="h-38 px-14" disabled={editing} onClick={() => setPeriodOpen(true)}>
            <SettingsOutlinedIcon style={{ fontSize: 16 }} />
            기간 설정
          </Button>
        </div>
        {editing && <div className="absolute inset-0 z-10 rounded-8 bg-overlay" />}
      </div>

      <div className="relative mt-16">
        <AttributionChart row={row} compare={compare} event={event} />
        {editing && (
          <div className="absolute inset-0 rounded-8 bg-overlay">
            <span className="absolute top-16 left-16 text-caption font-medium text-white">수정 중</span>
          </div>
        )}
      </div>

      {editing ? (
        <EditMode config={inAppEditConfig} settings={inApp} onExit={onExit} guardRef={guardRef} />
      ) : (
        <>
          <div className="mt-20 flex items-center justify-end gap-16">
            <Checkbox checked={includeEnded} onChange={onIncludeEnded}>
              종료된 캠페인 포함
            </Checkbox>
            <CampaignSearch settings={inApp.campaigns} includeEnded={includeEnded} onPick={onPick} />
          </div>
          <div className="mt-20">
            <SettingsTable
              grid="grid grid-cols-[700px_400px_200px]"
              headers={["설치"]}
              global={{ cells: [{ text: formatDuration(inApp.global) }], updatedAt: inApp.globalUpdatedAt }}
              channels={inApp.channels}
              campaigns={inApp.campaigns}
              channelCells={(channelId) => [{ text: formatDuration(resolveInApp(inApp, undefined, channelId)) }]}
              // 값이 한 칸이라 캠페인 행은 항상 자기 값(흐린 칸 없음)
              campaignCells={(channelId, campaignId) => [{ text: formatDuration(resolveInApp(inApp, undefined, channelId, campaignId)) }]}
              selection={selection}
              onSelect={setSelection}
              includeEnded={includeEnded}
              expanded={expanded}
              onToggleExpand={toggleExpand}
              highlight={highlight}
            />
          </div>
        </>
      )}

      {periodOpen && (
        <EventPeriodDialog
          settings={inApp}
          onClose={() => setPeriodOpen(false)}
          onSaved={(next) => {
            setInApp(next);
            setPeriodOpen(false);
            // 필터로 고른 이벤트가 삭제됐으면 "선택하지 않음"
            if (eventId && !next.events.some((e) => e.eventId === eventId)) setEventId(null);
          }}
        />
      )}
      <Toast message={toast} onDone={clearToast} />
    </div>
  );
}
