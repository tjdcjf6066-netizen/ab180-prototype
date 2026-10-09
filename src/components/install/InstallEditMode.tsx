"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import HistoryIcon from "@mui/icons-material/History";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { CampaignSearch } from "@/components/common/CampaignSearch";
import { ApplyDialog, type ApplyNotice } from "@/components/ui/ApplyDialog";
import { Button } from "@/components/ui/Button";
import { CampaignExpandButton } from "@/components/ui/CampaignExpandButton";
import { Dialog } from "@/components/ui/Dialog";
import { DurationInput } from "@/components/ui/DurationInput";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { PickerSelect } from "@/components/ui/PickerSelect";
import { gwaWa } from "@/lib/chart";
import { durationEquals, formatDuration, todayString } from "@/lib/duration";
import { installEditor, type CampaignRow, type ChannelRow, type InstallDraft } from "@/lib/edit";
import { CAMPAIGN_BY_ID, CAMPAIGNS, CHANNEL_BY_ID, CHANNELS } from "@/lib/mock/catalog";
import { channelDeleteCampaignCount, installSaveNotice } from "@/lib/notice";
import {
  INSTALL_CELL_KEYS,
  type Campaign,
  type Cell,
  type Channel,
  type Duration,
  type InstallCellKey,
  type InstallCells,
  type InstallSettings,
} from "@/lib/types";
import { GLOBAL_TOOLTIP, PolicyTooltip } from "./InstallTable";

// spec_screens.md 4-7 · 4-8 · 와이어프레임 W2. 열: 이름 300 · 값 230 × 4 · 아이콘 80 = 1300
const GRID = "grid grid-cols-[300px_230px_230px_230px_230px_80px]";
const HIGHLIGHT_MS = 2000;

/** 탭 이동 전에 부른다. 바꾼 내용이 있으면 나가기 팝업, 없으면 바로 proceed */
export type LeaveGuard = (proceed: () => void) => void;

type Props = {
  settings: InstallSettings;
  /** saved: 적용한 설정, null: 저장하지 않고 나감 */
  onExit: (saved: InstallSettings | null) => void;
  guardRef: MutableRefObject<LeaveGuard | null>;
};

const HEADERS: [string, string][] = [
  ["클릭", "디바이스 ID 매칭"],
  ["클릭", "확률적 모델링"],
  ["조회", "디바이스 ID 매칭"],
  ["조회", "확률적 모델링"],
];

const cellValue = (cell: Cell, parent: Duration) => (cell.mode === "own" ? cell.duration : parent);
const rowDomId = (key: string) => `edit-row-${key}`;

export function InstallEditMode({ settings, onExit, guardRef }: Props) {
  const [draft, setDraft] = useState<InstallDraft>(() => installEditor.toDraft(settings));
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [highlight, setHighlight] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [leave, setLeave] = useState<{ proceed: () => void } | null>(null);
  const [deleting, setDeleting] = useState<{ kind: "channel" | "campaign"; key: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const dirty = installEditor.isDirty(settings, draft);
  const canSave = installEditor.canSave(settings, draft);
  const discard = useCallback(() => onExit(null), [onExit]);

  // 탭 이동: 바꾼 내용이 있든 없든 항상 나가기 팝업
  useEffect(() => {
    guardRef.current = (proceed) => setLeave({ proceed });
    return () => {
      guardRef.current = null;
    };
  }, [guardRef]);

  // 브라우저 뒤로가기: 바꾼 내용이 있든 없든 항상 나가기 팝업(W2-L)
  useEffect(() => {
    history.pushState({ installEdit: true }, "");
    const onPop = () => {
      history.pushState({ installEdit: true }, "");
      setLeave({ proceed: () => {} });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const toggleExpand = (channelId: string, open?: boolean) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (open ?? !next.has(channelId)) next.add(channelId);
      else next.delete(channelId);
      return next;
    });

  // 수정 모드 검색: 채널 펼침 + 자동 스크롤 + 이름 칸 하이라이트(선택 · 차트 전환 없음)
  const onSearchPick = (campaign: Campaign) => {
    const row = draft.campaigns.find((r) => r.campaignId === campaign.id);
    if (!row) return;
    toggleExpand(campaign.channelId, true);
    const id = rowDomId(row.key);
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    setHighlight(id);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setHighlight(null), HIGHLIGHT_MS);
  };

  const onCancel = () => (dirty ? setLeave({ proceed: () => {} }) : discard());

  // 적용 확인 팝업: 저장한 뒤의 상태 기준 개수
  const after = applyOpen ? installEditor.apply(settings, draft, todayString()) : null;
  const counts = after ? installSaveNotice(settings, after) : null;
  const notice: ApplyNotice | null = counts && {
    title: `기여 기간을 별도로 설정한 채널 ${counts.channels}개(그 안의 캠페인 포함) · 캠페인 ${counts.campaigns}개에는 반영되지 않습니다.`,
    body: "기여 기간을 별도로 설정한 채널 · 캠페인을 제외한 모든 채널 · 캠페인에 적용됩니다.",
  };

  const visibleCampaigns = (channelId: string) =>
    draft.campaigns.filter(
      (r) => r.channelId === channelId && (r.campaignId === null || CAMPAIGN_BY_ID.get(r.campaignId)?.status === "active"),
    );
  const channelCells = (channelId: string) => draft.channels.find((r) => r.channelId === channelId)?.cells;

  const addedChannelIds = new Set(draft.channels.map((r) => r.channelId));
  const addedCampaignIds = new Set(draft.campaigns.map((r) => r.campaignId));
  const pickableChannels = CHANNELS.filter((c) => !addedChannelIds.has(c.id)).sort((a, b) => a.name.localeCompare(b.name, "en"));

  return (
    <>
      <div className="mt-20 flex items-center justify-end">
        <CampaignSearch
          settings={draft.campaigns.flatMap((r) => (r.campaignId ? [{ campaignId: r.campaignId }] : []))}
          includeEnded={false}
          onPick={onSearchPick}
        />
      </div>

      <div className="mt-20 rounded-8 border border-border">
        <div className={`${GRID} h-64 rounded-t-8 bg-bg-subtle text-caption text-text-secondary`}>
          <div className="flex items-center px-16">채널 / 캠페인</div>
          {HEADERS.map(([a, b]) => (
            <div key={a + b} className="flex flex-col justify-center px-12">
              <span>{a}</span>
              <span>{b}</span>
            </div>
          ))}
          <div />
        </div>

        {/* 기본 설정 */}
        <div className={`${GRID} min-h-48 border-t border-divider text-body-sm text-text-placeholder`}>
          <div className="flex items-center gap-6 px-16">
            기본 설정
            <InfoOutlinedIcon style={{ fontSize: 15 }} />
          </div>
          {INSTALL_CELL_KEYS.map((k) => (
            <div key={k} className="flex items-center px-12">
              {formatDuration(settings.defaults[k])}
            </div>
          ))}
          <div />
        </div>

        {/* 글로벌 */}
        <EditRow
          id={rowDomId("global")}
          highlighted={false}
          name={
            <span className="flex items-center gap-8">
              글로벌
              <InfoTooltip>{GLOBAL_TOOLTIP}</InfoTooltip>
            </span>
          }
          cells={INSTALL_CELL_KEYS.map((k) => (
            <DurationInput
              key={k}
              tab="install"
              cell={{ mode: "own", duration: draft.global[k] }}
              shown={draft.global[k]}
              onChange={(c) => c.mode === "own" && setDraft(installEditor.setGlobal(draft, { ...draft.global, [k]: c.duration }))}
            />
          ))}
          action={
            <IconAction
              label="기본 설정으로 되돌리기"
              disabled={INSTALL_CELL_KEYS.every((k) => durationEquals(draft.global[k], settings.defaults[k]))}
              onClick={() => setDraft(installEditor.setGlobal(draft, settings.defaults))}
            >
              <HistoryIcon style={{ fontSize: 20 }} />
            </IconAction>
          }
        />

        {draft.channels.map((row) => (
          <ChannelBlock
            key={row.key}
            row={row}
            draft={draft}
            settings={settings}
            open={row.channelId !== null && expanded.has(row.channelId)}
            highlight={highlight}
            campaigns={row.channelId ? visibleCampaigns(row.channelId) : []}
            pickableChannels={pickableChannels}
            pickableCampaigns={
              row.channelId
                ? CAMPAIGNS.filter((c) => c.channelId === row.channelId && c.status === "active" && !addedCampaignIds.has(c.id))
                : []
            }
            channelCells={row.channelId ? channelCells(row.channelId) : undefined}
            onToggle={() => row.channelId && toggleExpand(row.channelId)}
            onAddCampaign={() => {
              if (!row.channelId) return;
              setDraft(installEditor.addCampaignRow(draft, row.channelId));
              toggleExpand(row.channelId, true);
            }}
            onDraft={setDraft}
            onDelete={(kind, key, picked) =>
              picked ? setDeleting({ kind, key }) : setDraft(kind === "channel" ? installEditor.removeChannelRow(draft, key) : installEditor.removeCampaignRow(draft, key))
            }
          />
        ))}
      </div>

      <div className="mt-20 flex items-center justify-between">
        <Button variant="outline" className="h-40 px-16" onClick={() => setDraft(installEditor.addChannelRow(draft))}>
          <AddIcon style={{ fontSize: 16 }} />
          추가
        </Button>
        <div className="flex gap-8">
          <Button variant="secondary" className="h-40 px-20" onClick={onCancel}>
            취소
          </Button>
          <Button className="h-40 px-20" disabled={!canSave} onClick={() => setApplyOpen(true)}>
            저장
          </Button>
        </div>
      </div>

      <ApplyDialog
        open={applyOpen}
        title="수정한 기여 기간 설정을 적용하겠습니까?"
        notice={notice}
        onCancel={() => setApplyOpen(false)}
        onApply={() => after && onExit(after)}
      />

      <Dialog
        open={leave !== null}
        onClose={() => setLeave(null)}
        title="입력 중인 설정을 떠나겠습니까?"
        actions={
          <>
            <Button variant="secondary" onClick={() => setLeave(null)}>
              취소
            </Button>
            <Button
              onClick={() => {
                const proceed = leave?.proceed;
                setLeave(null);
                discard();
                proceed?.();
              }}
            >
              떠나기
            </Button>
          </>
        }
      >
        지금 떠나면 입력한 내용이 초기화됩니다.
      </Dialog>

      <DeleteDialog
        deleting={deleting}
        draft={draft}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          setDraft(
            deleting.kind === "channel"
              ? installEditor.removeChannelRow(draft, deleting.key)
              : installEditor.removeCampaignRow(draft, deleting.key),
          );
          setDeleting(null);
        }}
      />
    </>
  );
}

function ChannelBlock({
  row,
  draft,
  settings,
  open,
  highlight,
  campaigns,
  pickableChannels,
  pickableCampaigns,
  channelCells,
  onToggle,
  onAddCampaign,
  onDraft,
  onDelete,
}: {
  row: ChannelRow<InstallCells>;
  draft: InstallDraft;
  settings: InstallSettings;
  open: boolean;
  highlight: string | null;
  campaigns: CampaignRow<InstallCells>[];
  pickableChannels: Channel[];
  pickableCampaigns: Campaign[];
  channelCells?: InstallCells;
  onToggle: () => void;
  onAddCampaign: () => void;
  onDraft: (d: InstallDraft) => void;
  onDelete: (kind: "channel" | "campaign", key: string, picked: boolean) => void;
}) {
  const channel = row.channelId ? CHANNEL_BY_ID.get(row.channelId) : undefined;
  const channelValue = (k: InstallCellKey) => (channelCells ? cellValue(channelCells[k], draft.global[k]) : draft.global[k]);
  const setChannelCell = (k: InstallCellKey, c: Cell) =>
    onDraft(installEditor.setChannelCells(draft, row.key, { ...row.cells, [k]: c }));

  return (
    <>
      <EditRow
        id={rowDomId(row.key)}
        highlighted={false}
        name={
          channel ? (
            <span className="flex flex-col items-start gap-6">
              <span className="flex items-center gap-8">
                {channel.name}
                {channel.hasPolicyInfo && <PolicyTooltip />}
              </span>
              {campaigns.length > 0 ? (
                <CampaignExpandButton count={campaigns.length} open={open} onClick={onToggle} suffix={open ? " 접기" : " 보기 · 추가"} />
              ) : (
                <AddCampaignLink onClick={onAddCampaign} />
              )}
            </span>
          ) : (
            <PickerSelect
              placeholder="채널을 선택해 주세요."
              searchPlaceholder="채널을 선택하거나 검색해 주세요."
              groups={[{ title: "Integrated Channels", items: pickableChannels }]}
              getKey={(c) => c.id}
              getLabel={(c) => c.name}
              renderExtra={(c) => c.hasPolicyInfo && <InfoOutlinedIcon className="text-icon" style={{ fontSize: 15 }} />}
              empty={null}
              noMatch={(q) => `'${q}'${gwaWa(q)} 일치하는 채널이 없어요.`}
              onPick={(c) => onDraft(installEditor.selectChannel(draft, row.key, c.id))}
            />
          )
        }
        cells={INSTALL_CELL_KEYS.map((k) => (
          <DurationInput
            key={k}
            tab="install"
            cell={row.cells[k]}
            shown={cellValue(row.cells[k], draft.global[k])}
            follow={{ label: "글로벌 값 따르기", value: draft.global[k] }}
            onChange={(c) => setChannelCell(k, c)}
          />
        ))}
        action={
          <IconAction label="삭제" onClick={() => onDelete("channel", row.key, row.channelId !== null)}>
            <DeleteOutlineIcon style={{ fontSize: 20 }} />
          </IconAction>
        }
      />

      {open && channel && (
        <>
          <div className={`${GRID} min-h-48 border-t border-divider`}>
            <div className="flex items-center gap-8 pr-16 pl-28">
              <Elbow />
              <AddCampaignLink onClick={onAddCampaign} size="body-sm" />
            </div>
          </div>
          {campaigns.map((cr) => {
            const campaign = cr.campaignId ? CAMPAIGN_BY_ID.get(cr.campaignId) : undefined;
            const id = rowDomId(cr.key);
            return (
              <EditRow
                key={cr.key}
                id={id}
                highlighted={highlight === id}
                indent
                name={
                  <span className="flex w-full min-w-0 items-center gap-8">
                    <Elbow />
                    {campaign ? (
                      campaign.name
                    ) : (
                      <PickerSelect
                        placeholder="캠페인을 선택해 주세요."
                        searchPlaceholder="캠페인을 선택하거나 검색해 주세요."
                        groups={[{ title: `${channel.name} · 진행 중 캠페인`, items: pickableCampaigns }]}
                        getKey={(c) => c.id}
                        getLabel={(c) => c.name}
                        empty={
                          <>
                            <p className="text-body-sm font-medium">추가할 수 있는 진행 중 캠페인이 없어요.</p>
                            <p className="mt-4 text-caption text-text-secondary">
                              {channel.name}에 진행 중인 캠페인이 없거나, 진행 중 캠페인이 모두 이미 설정되어 있습니다.
                            </p>
                          </>
                        }
                        noMatch={(q) => `'${q}'${gwaWa(q)} 일치하는 진행 중 캠페인이 없어요.`}
                        onPick={(c) => onDraft(installEditor.selectCampaign(draft, cr.key, c.id))}
                      />
                    )}
                  </span>
                }
                cells={INSTALL_CELL_KEYS.map((k) => {
                  const policy = cr.campaignId
                    ? settings.policies.find((p) => p.campaignId === cr.campaignId && p.cellKey === k)
                    : undefined;
                  return (
                    <DurationInput
                      key={k}
                      tab="install"
                      cell={cr.cells[k]}
                      shown={policy ? policy.duration : cellValue(cr.cells[k], channelValue(k))}
                      disabled={!!policy}
                      follow={{ label: `${channel.name} 값 따르기`, value: channelValue(k) }}
                      onChange={(c) =>
                        onDraft(installEditor.setCampaignCells(draft, cr.key, { ...cr.cells, [k]: c }))
                      }
                    />
                  );
                })}
                action={
                  <IconAction label="삭제" onClick={() => onDelete("campaign", cr.key, cr.campaignId !== null)}>
                    <DeleteOutlineIcon style={{ fontSize: 20 }} />
                  </IconAction>
                }
              />
            );
          })}
        </>
      )}
    </>
  );
}

function EditRow({
  id,
  highlighted,
  indent,
  name,
  cells,
  action,
}: {
  id: string;
  highlighted: boolean;
  indent?: boolean;
  name: ReactNode;
  cells: ReactNode[];
  action: ReactNode;
}) {
  return (
    <div id={id} className={`${GRID} min-h-70 scroll-mt-16 border-t border-divider text-body`}>
      <div
        className={`flex items-center py-12 pr-16 transition-colors duration-300 ${indent ? "pl-28" : "pl-16"} ${
          highlighted ? "bg-primary-weak" : ""
        }`}
      >
        {name}
      </div>
      {cells.map((c, i) => (
        <div key={i} className="flex items-center px-12">
          {c}
        </div>
      ))}
      <div className="flex items-center justify-center">{action}</div>
    </div>
  );
}

// 글로벌이 이미 기본 설정과 같으면 되돌리기는 Dim
function IconAction({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex size-32 items-center justify-center rounded-6 ${
        disabled ? "cursor-not-allowed text-divider" : "text-icon hover:bg-bg-subtle"
      }`}
    >
      {children}
    </button>
  );
}

function AddCampaignLink({ onClick, size = "caption" }: { onClick: () => void; size?: "caption" | "body-sm" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-medium text-primary ${size === "caption" ? "text-caption" : "text-body-sm"}`}
    >
      + 캠페인 한정 설정 추가
    </button>
  );
}

function Elbow() {
  return <span className="mb-6 h-10 w-8 shrink-0 border-b border-l border-text-placeholder" aria-hidden />;
}

function DeleteDialog({
  deleting,
  draft,
  onClose,
  onConfirm,
}: {
  deleting: { kind: "channel" | "campaign"; key: string } | null;
  draft: InstallDraft;
  onClose: () => void;
  onConfirm: () => void;
}) {
  let title = "";
  let body: ReactNode = null;
  if (deleting?.kind === "channel") {
    const row = draft.channels.find((r) => r.key === deleting.key);
    const name = row?.channelId ? CHANNEL_BY_ID.get(row.channelId)?.name : "";
    const n = row?.channelId ? channelDeleteCampaignCount(draft, row.channelId) : 0;
    title = `${name}의 기여 기간을 삭제하겠습니까?`;
    body = (
      <>
        <p>기여 기간을 삭제하면 글로벌로 설정된 기여 기간이 자동 적용됩니다.</p>
        {n > 0 && (
          <div className="mt-16 rounded-8 bg-danger-weak px-16 py-12 text-body">
            <p className="font-bold text-text-danger">{`이 채널에서 캠페인별로 설정한 기여 기간 ${n}개(종료된 캠페인 포함)도 함께 삭제됩니다.`}</p>
            <p className="mt-4">삭제한 캠페인에도 글로벌로 설정된 기여 기간이 적용됩니다.</p>
          </div>
        )}
      </>
    );
  } else if (deleting?.kind === "campaign") {
    const row = draft.campaigns.find((r) => r.key === deleting.key);
    const campaign = row?.campaignId ? CAMPAIGN_BY_ID.get(row.campaignId) : undefined;
    title = `${campaign?.name ?? ""}의 기여 기간을 삭제하겠습니까?`;
    body = <p>{`기여 기간을 삭제하면 ${CHANNEL_BY_ID.get(row?.channelId ?? "")?.name ?? ""}에 설정된 기여 기간이 자동 적용됩니다.`}</p>;
  }
  return (
    <Dialog
      open={deleting !== null}
      onClose={onClose}
      title={title}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            삭제
          </Button>
        </>
      }
    >
      {body}
    </Dialog>
  );
}
