"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { LeaveDialog } from "@/components/common/EditMode";
import { ApplyDialog } from "@/components/ui/ApplyDialog";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { DurationInput } from "@/components/ui/DurationInput";
import { PickerSelect } from "@/components/ui/PickerSelect";
import { Tag } from "@/components/ui/Tag";
import { gwaWa } from "@/lib/chart";
import { todayString } from "@/lib/duration";
import { eventsEditor, type EventsDraft } from "@/lib/edit";
import { EVENT_BY_ID, IN_APP_EVENTS } from "@/lib/mock/catalog";
import type { InAppSettings } from "@/lib/types";

// spec_screens.md 5-4 인앱 이벤트 기간 설정 팝업 · 와이어프레임 W3-P1 ~ P5
const GRID = "grid grid-cols-[1fr_240px_56px]";

type Props = {
  settings: InAppSettings;
  onClose: () => void;
  onSaved: (next: InAppSettings) => void;
};

export function EventPeriodDialog({ settings, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState<EventsDraft>(() => eventsEditor.toDraft(settings));
  const [applyOpen, setApplyOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const rowCount = useRef(draft.rows.length);

  // 행을 추가하면 목록을 맨 아래로 스크롤해 새 행이 보이게
  useEffect(() => {
    if (draft.rows.length > rowCount.current) listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    rowCount.current = draft.rows.length;
  }, [draft.rows.length]);

  const dirty = eventsEditor.isDirty(settings, draft);
  const canSave = eventsEditor.canSave(settings, draft);
  // 바꾼 내용이 있으면 나가기 팝업을 먼저(W3-P5), 없으면 바로 닫힘
  const requestClose = () => (dirty ? setLeaveOpen(true) : onClose());
  const childOpen = applyOpen || leaveOpen || deleting !== null;

  useEffect(() => {
    if (childOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (dirty ? setLeaveOpen(true) : onClose());
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [childOpen, dirty, onClose]);

  const chosen = new Set(draft.rows.map((r) => r.eventId));
  const pickable = IN_APP_EVENTS.filter((e) => !chosen.has(e.id));
  const deletingRow = draft.rows.find((r) => r.key === deleting);

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay">
        <div role="dialog" aria-modal="true" className="flex max-h-[calc(100dvh-48px)] w-760 flex-col gap-20 rounded-20 bg-white px-40 pt-36 pb-32">
          <div className="flex items-center justify-between">
            <h2 className="text-modal-title font-bold">
              인앱 이벤트별 기간 설정 <span className="text-primary">{draft.rows.filter((r) => r.eventId).length}개</span>
            </h2>
            <button type="button" aria-label="닫기" onClick={requestClose} className="flex text-icon-strong">
              <CloseIcon style={{ fontSize: 24 }} />
            </button>
          </div>
          <p className="-mt-8 text-body-sm text-text-secondary">
            설정한 인앱 이벤트는 캠페인 · 채널 · 글로벌보다 우선합니다. 설치 타겟 이벤트의 어트리뷰션 윈도우에 적용됩니다.
          </p>

          {/* 화면이 낮으면 목록 영역만 줄어들고 스크롤 */}
          <div className="flex min-h-0 flex-col rounded-8 border border-border">
            <div className={`${GRID} h-44 shrink-0 rounded-t-8 bg-bg-subtle text-caption text-text-secondary`}>
              <div className="flex items-center px-16">인앱 이벤트</div>
              <div className="flex items-center px-12">설치</div>
              <div />
            </div>
            {/* 팝업 높이는 고정하고 목록만 스크롤(W3-P3). 최대 360, 화면이 낮으면 더 줄어듦 */}
            <div ref={listRef} className="max-h-360 min-h-0 overflow-y-auto">
              {draft.rows.map((r) => {
                const ev = r.eventId ? EVENT_BY_ID.get(r.eventId) : undefined;
                return (
                  <div key={r.key} className={`${GRID} min-h-60 border-t border-divider text-body`}>
                    <div className="flex min-w-0 items-center gap-6 px-16">
                      {ev ? (
                        <>
                          <span className="truncate">{ev.name}</span>
                          {ev.kind === "custom" && <Tag>커스텀</Tag>}
                        </>
                      ) : (
                        <PickerSelect
                          placeholder="인앱 이벤트를 선택해 주세요."
                          searchPlaceholder="인앱 이벤트를 선택하거나 검색해 주세요."
                          groups={[
                            { title: "스탠다드 이벤트", items: pickable.filter((e) => e.kind === "standard") },
                            { title: "커스텀 이벤트", items: pickable.filter((e) => e.kind === "custom") },
                          ]}
                          getKey={(e) => e.id}
                          getLabel={(e) => e.name}
                          empty={null}
                          noMatch={(q) => `'${q}'${gwaWa(q)} 일치하는 인앱 이벤트가 없어요.`}
                          onPick={(e) => setDraft(eventsEditor.selectEvent(draft, r.key, e.id))}
                        />
                      )}
                    </div>
                    <div className="flex items-center px-12">
                      <DurationInput
                        tab="inApp"
                        cell={{ mode: "own", duration: r.duration }}
                        shown={r.duration}
                        onChange={(c) => c.mode === "own" && setDraft(eventsEditor.setDuration(draft, r.key, c.duration))}
                      />
                    </div>
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        aria-label="삭제"
                        onClick={() => (r.eventId ? setDeleting(r.key) : setDraft(eventsEditor.removeRow(draft, r.key)))}
                        className="flex size-32 items-center justify-center rounded-6 text-icon hover:bg-bg-subtle"
                      >
                        <DeleteOutlineIcon style={{ fontSize: 20 }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <Button variant="outline" className="h-36 px-14" onClick={() => setDraft(eventsEditor.addRow(draft))}>
              <AddIcon style={{ fontSize: 16 }} />
              인앱 이벤트 추가
            </Button>
          </div>

          <div className="flex justify-end gap-12">
            <button type="button" onClick={requestClose} className="h-48 w-160 rounded-8 border border-border bg-white text-body font-medium">
              취소
            </button>
            <Button className="h-48 w-160" disabled={!canSave} onClick={() => setApplyOpen(true)}>
              저장
            </Button>
          </div>
        </div>
      </div>

      {/* 저장 → 적용 확인(W3-P4). 취소 / ✕는 이 팝업으로 돌아옴(입력 유지) */}
      <ApplyDialog
        open={applyOpen}
        title="수정한 기여 기간 설정을 적용하겠습니까?"
        notice={{ title: "인앱 이벤트 설정은 모든 채널 · 캠페인의 기여 기간보다 우선 적용됩니다." }}
        onCancel={() => setApplyOpen(false)}
        onApply={() => onSaved(eventsEditor.apply(settings, draft, todayString()))}
      />

      <LeaveDialog open={leaveOpen} onStay={() => setLeaveOpen(false)} onLeave={onClose} />

      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={`${deletingRow?.eventId ? EVENT_BY_ID.get(deletingRow.eventId)?.name : ""}의 기여 기간을 삭제하겠습니까?`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              취소
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleting) setDraft(eventsEditor.removeRow(draft, deleting));
                setDeleting(null);
              }}
            >
              삭제
            </Button>
          </>
        }
      >
        기여 기간을 삭제하면 이 인앱 이벤트에는 캠페인 · 채널 · 글로벌 순으로 설정된 기여 기간이 적용됩니다.
      </Dialog>
    </>,
    document.body,
  );
}
