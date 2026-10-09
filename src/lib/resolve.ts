// 적용값 계산 — docs/spec_data.md 3장
import type { Duration, InAppSettings, InstallCellKey, InstallSettings } from "./types";

// 정책 > 캠페인 > 채널 > 글로벌
export function resolveInstall(
  s: InstallSettings,
  cell: InstallCellKey,
  channelId?: string,
  campaignId?: string,
): Duration {
  if (campaignId) {
    const policy = s.policies.find((p) => p.campaignId === campaignId && p.cellKey === cell);
    if (policy) return policy.duration;
    const own = s.campaigns.find((c) => c.campaignId === campaignId)?.cells[cell];
    if (own?.mode === "own") return own.duration;
  }
  if (channelId) {
    const own = s.channels.find((c) => c.channelId === channelId)?.cells[cell];
    if (own?.mode === "own") return own.duration;
  }
  return s.global[cell];
}

// 인앱 이벤트 > 캠페인 > 채널 > 글로벌
export function resolveInApp(s: InAppSettings, eventId?: string, channelId?: string, campaignId?: string): Duration {
  if (eventId) {
    const event = s.events.find((e) => e.eventId === eventId);
    if (event) return event.duration;
  }
  if (campaignId) {
    const own = s.campaigns.find((c) => c.campaignId === campaignId)?.cell;
    if (own?.mode === "own") return own.duration;
  }
  if (channelId) {
    const own = s.channels.find((c) => c.channelId === channelId)?.cell;
    if (own?.mode === "own") return own.duration;
  }
  return s.global;
}
