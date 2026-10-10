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
import { durationEquals, formatDuration, todayString, type Tab } from "@/lib/duration";
import type { CampaignRow, ChannelRow, Draft, Editor } from "@/lib/edit";
import { CAMPAIGN_BY_ID, CAMPAIGNS, CHANNEL_BY_ID, CHANNELS } from "@/lib/mock/catalog";
import { channelDeleteCampaignCount } from "@/lib/notice";
import type { Campaign, Cell, Channel, Duration } from "@/lib/types";

// 수정 모드 — 설치 탭(칸 4개) · 인앱이벤트 탭(칸 1개) 공통. spec_screens.md 4-7 · 4-8 · 5-5 · 와이어프레임 W2 · W3
const HIGHLIGHT_MS = 2000;

/** 탭 이동 전에 부른다. 나가기 팝업을 띄우고 떠나기를 누르면 proceed */
export type LeaveGuard = (proceed: () => void) => void;

/** 탭마다 다른 부분: 칸 모양 · 열 · 정책 칸 · 적용 확인 안내 */
export type EditConfig<S, G, C> = {
  tab: Tab;
  editor: Editor<S, G, C>;
  /** grid-template-columns. 이름 · 값 칸들 · 아이콘 */
  grid: string;
  keys: string[];
  headers: ReactNode[];
  defaults: (s: S) => G;
  globalOf: (g: G, key: string) => Duration;
  withGlobal: (g: G, key: string, d: Duration) => G;
  cellOf: (c: C, key: string) => Cell;
  withCell: (c: C, key: string, cell: Cell) => C;
  /** 광고 채널 정책 칸(설치 탭만) */
  policy?: (s: S, campaignId: string, key: string) => Duration | undefined;
  /** 채널명 옆 ⓘ(설치 탭만) */
  channelInfo?: (channel: Channel) => ReactNode;
  notice: (before: S, after: S) => ApplyNotice | null;
};

type Props<S, G, C> = {
  config: EditConfig<S, G, C>;
  settings: S;
  /** saved: 적용한 설정, null: 저장하지 않고 나감 */
  onExit: (saved: S | null) => void;
  guardRef: MutableRefObject<LeaveGuard | null>;
};

export const GLOBAL_TOOLTIP = "기여 기간을 별도로 설정한 채널 · 캠페인을 제외한 모든 채널 · 캠페인에 적용됩니다.";

const cellValue = (cell: Cell, parent: Duration) => (cell.mode === "own" ? cell.duration : parent);
const rowDomId = (key: string) => `edit-row-${key}`;

export function EditMode<S, G, C>({ config, settings, onExit, guardRef }: Props<S, G, C>) {
  const { editor } = config;
  const [draft, setDraft] = useState<Draft<G, C>>(() => editor.toDraft(settings));
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [highlight, setHighlight] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [leave, setLeave] = useState<{ proceed: () => void } | null>(null);
  const [deleting, setDeleting] = useState<{ kind: "channel" | "campaign"; key: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const dirty = editor.isDirty(settings, draft);
  const canSave = editor.canSave(settings, draft);
  const discard = useCallback(() => onExit(null), [onExit]);

  // 탭 · 하위 탭 이동: 바꾼 내용이 있든 없든 항상 나가기 팝업
  useEffect(() => {
    guardRef.current = (proceed) => setLeave({ proceed });
    return () => {
      guardRef.current = null;
    };
  }, [guardRef]);

  // 브라우저 뒤로가기: 바꾼 내용이 있든 없든 항상 나가기 팝업(W2-L)
  useEffect(() => {
    history.pushState({ editMode: true }, "");
    const onPop = () => {
      history.pushState({ editMode: true }, "");
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

  // 하단 [취소]는 바꾼 내용이 있을 때만 나가기 팝업
  const onCancel = () => (dirty ? setLeave({ proceed: () => {} }) : discard());

  // 적용 확인 팝업: 저장한 뒤의 상태 기준 개수
  const after = applyOpen ? editor.apply(settings, draft, todayString()) : null;
  const notice = after ? config.notice(settings, after) : null;

  const visibleCampaigns = (channelId: string) =>
    draft.campaigns.filter(
      (r) => r.channelId === channelId && (r.campaignId === null || CAMPAIGN_BY_ID.get(r.campaignId)?.status === "active"),
    );
  const addedChannelIds = new Set(draft.channels.map((r) => r.channelId));
  const addedCampaignIds = new Set(draft.campaigns.map((r) => r.campaignId));
  const pickableChannels = CHANNELS.filter((c) => !addedChannelIds.has(c.id)).sort((a, b) => a.name.localeCompare(b.name, "en"));
  const defaults = config.defaults(settings);
  const atDefaults = config.keys.every((k) => durationEquals(config.globalOf(draft.global, k), config.globalOf(defaults, k)));

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
        <div className={`${config.grid} h-64 rounded-t-8 bg-bg-subtle text-caption text-text-secondary`}>
          <div className="flex items-center px-16">채널 / 캠페인</div>
          {config.headers.map((h, i) => (
            <div key={i} className="flex flex-col justify-center px-12">
              {h}
            </div>
          ))}
          <div />
        </div>

        {/* 기본 설정 */}
        <div className={`${config.grid} min-h-48 border-t border-divider text-body-sm text-text-placeholder`}>
          <div className="flex items-center gap-6 px-16">
            기본 설정
            <InfoOutlinedIcon style={{ fontSize: 15 }} />
          </div>
          {config.keys.map((k) => (
            <div key={k} className="flex items-center px-12">
              {formatDuration(config.globalOf(defaults, k))}
            </div>
          ))}
          <div />
        </div>

        {/* 글로벌 */}
        <EditRow
          grid={config.grid}
          id={rowDomId("global")}
          highlighted={false}
          name={
            <span className="flex items-center gap-8">
              글로벌
              <InfoTooltip>{GLOBAL_TOOLTIP}</InfoTooltip>
            </span>
          }
          cells={config.keys.map((k) => (
            <DurationInput
              key={k}
              tab={config.tab}
              cell={{ mode: "own", duration: config.globalOf(draft.global, k) }}
              shown={config.globalOf(draft.global, k)}
              onChange={(c) => c.mode === "own" && setDraft(editor.setGlobal(draft, config.withGlobal(draft.global, k, c.duration)))}
            />
          ))}
          action={
            // 글로벌이 이미 기본 설정과 같으면 되돌리기는 Dim
            <IconAction label="기본 설정으로 되돌리기" disabled={atDefaults} onClick={() => setDraft(editor.setGlobal(draft, defaults))}>
              <HistoryIcon style={{ fontSize: 20 }} />
            </IconAction>
          }
        />

        {draft.channels.map((row) => (
          <ChannelBlock
            key={row.key}
            config={config}
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
            onToggle={() => row.channelId && toggleExpand(row.channelId)}
            onAddCampaign={() => {
              if (!row.channelId) return;
              setDraft(editor.addCampaignRow(draft, row.channelId));
              toggleExpand(row.channelId, true);
            }}
            onDraft={setDraft}
            onDelete={(kind, key, picked) =>
              picked
                ? setDeleting({ kind, key })
                : setDraft(kind === "channel" ? editor.removeChannelRow(draft, key) : editor.removeCampaignRow(draft, key))
            }
          />
        ))}
      </div>

      <div className="mt-20 flex items-center justify-between">
        <Button variant="outline" className="h-40 px-16" onClick={() => setDraft(editor.addChannelRow(draft))}>
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

      <LeaveDialog
        open={leave !== null}
        onStay={() => setLeave(null)}
        onLeave={() => {
          const proceed = leave?.proceed;
          setLeave(null);
          discard();
          proceed?.();
        }}
      />

      <DeleteDialog
        deleting={deleting}
        draft={draft}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          setDraft(
            deleting.kind === "channel" ? editor.removeChannelRow(draft, deleting.key) : editor.removeCampaignRow(draft, deleting.key),
          );
          setDeleting(null);
        }}
      />
    </>
  );
}

function ChannelBlock<S, G, C>({
  config,
  row,
  draft,
  settings,
  open,
  highlight,
  campaigns,
  pickableChannels,
  pickableCampaigns,
  onToggle,
  onAddCampaign,
  onDraft,
  onDelete,
}: {
  config: EditConfig<S, G, C>;
  row: ChannelRow<C>;
  draft: Draft<G, C>;
  settings: S;
  open: boolean;
  highlight: string | null;
  campaigns: CampaignRow<C>[];
  pickableChannels: Channel[];
  pickableCampaigns: Campaign[];
  onToggle: () => void;
  onAddCampaign: () => void;
  onDraft: (d: Draft<G, C>) => void;
  onDelete: (kind: "channel" | "campaign", key: string, picked: boolean) => void;
}) {
  const { editor } = config;
  const channel = row.channelId ? CHANNEL_BY_ID.get(row.channelId) : undefined;
  const globalValue = (k: string) => config.globalOf(draft.global, k);
  const channelValue = (k: string) => cellValue(config.cellOf(row.cells, k), globalValue(k));

  return (
    <>
      <EditRow
        grid={config.grid}
        id={rowDomId(row.key)}
        highlighted={false}
        name={
          channel ? (
            <span className="flex flex-col items-start gap-6">
              <span className="flex items-center gap-8">
                {channel.name}
                {config.channelInfo?.(channel)}
              </span>
              {campaigns.length > 0 ? (
                <CampaignExpandButton editing count={campaigns.length} open={open} onClick={onToggle} suffix={open ? " 접기" : " 보기 · 추가"} />
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
              renderExtra={(c) => config.channelInfo && c.hasPolicyInfo && <InfoOutlinedIcon className="text-icon" style={{ fontSize: 15 }} />}
              empty={null}
              noMatch={(q) => `'${q}'${gwaWa(q)} 일치하는 채널이 없어요.`}
              onPick={(c) => onDraft(editor.selectChannel(draft, row.key, c.id))}
            />
          )
        }
        cells={config.keys.map((k) => (
          <DurationInput
            key={k}
            tab={config.tab}
            cell={config.cellOf(row.cells, k)}
            shown={channelValue(k)}
            follow={{ label: "글로벌 값 따르기", value: globalValue(k) }}
            onChange={(c) => onDraft(editor.setChannelCells(draft, row.key, config.withCell(row.cells, k, c)))}
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
          <div className={`${config.grid} min-h-48 border-t border-divider`}>
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
                grid={config.grid}
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
                        onPick={(c) => onDraft(editor.selectCampaign(draft, cr.key, c.id))}
                      />
                    )}
                  </span>
                }
                cells={config.keys.map((k) => {
                  const policy = cr.campaignId ? config.policy?.(settings, cr.campaignId, k) : undefined;
                  return (
                    <DurationInput
                      key={k}
                      tab={config.tab}
                      cell={config.cellOf(cr.cells, k)}
                      shown={policy ?? cellValue(config.cellOf(cr.cells, k), channelValue(k))}
                      disabled={!!policy}
                      follow={{ label: `${channel.name} 값 따르기`, value: channelValue(k) }}
                      onChange={(c) => onDraft(editor.setCampaignCells(draft, cr.key, config.withCell(cr.cells, k, c)))}
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
  grid,
  id,
  highlighted,
  indent,
  name,
  cells,
  action,
}: {
  grid: string;
  id: string;
  highlighted: boolean;
  indent?: boolean;
  name: ReactNode;
  cells: ReactNode[];
  action: ReactNode;
}) {
  return (
    <div id={id} className={`${grid} min-h-70 scroll-mt-16 border-t border-divider text-body`}>
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
    <button type="button" onClick={onClick} className={`font-medium text-primary ${size === "caption" ? "text-caption" : "text-body-sm"}`}>
      + 캠페인 한정 설정 추가
    </button>
  );
}

function Elbow() {
  return <span className="mb-6 h-10 w-8 shrink-0 border-b border-l border-text-placeholder" aria-hidden />;
}

// 나가기 팝업 — 수정 모드 · 인앱 이벤트 기간 설정 팝업 공통(W2-L · W3-P5)
export function LeaveDialog({ open, onStay, onLeave }: { open: boolean; onStay: () => void; onLeave: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onStay}
      title="입력 중인 설정을 떠나겠습니까?"
      actions={
        <>
          <Button variant="secondary" onClick={onStay}>
            취소
          </Button>
          <Button onClick={onLeave}>떠나기</Button>
        </>
      }
    >
      지금 떠나면 입력한 내용이 초기화됩니다.
    </Dialog>
  );
}

function DeleteDialog<G, C>({
  deleting,
  draft,
  onClose,
  onConfirm,
}: {
  deleting: { kind: "channel" | "campaign"; key: string } | null;
  draft: Draft<G, C>;
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
