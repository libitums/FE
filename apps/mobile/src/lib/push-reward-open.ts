// 누른 서버 푸시의 보상 신호(ADR-0175) — 알림을 눌러 여정 맵 목적지로 들어왔다는 사실과 캠페인 id를 지도 안내(`use-push-reward`)에
// 넘깁니다. 누름은 앱 구간에 들어선 뒤 `use-opened-push`가 꺼내므로, 안내 훅이 아직 서지 않았어도 다음 구독 때 꺼낼 수 있게 들고 있습니다.
// background 스레드(효과 · 전역 이벤트)에서만 부릅니다.

import type { PushNotificationTarget } from "../screens/notifications/notifications.contract";

export type PushRewardOpen = { readonly campaignId: string | null };

let pending: PushRewardOpen | null = null;
const listeners = new Set<() => void>();

/** 보상 캠페인은 여정 맵 목적지로만 옵니다 — 다른 목적지(선톡 방 · 알림 목록)는 신호가 아닙니다. */
export function notePushRewardOpen(target: PushNotificationTarget): void {
  if (target.kind !== "journey-map") return;
  pending = { campaignId: target.campaignId ?? null };
  for (const listener of [...listeners]) listener();
}

export function takePushRewardOpen(): PushRewardOpen | null {
  const taken = pending;
  pending = null;
  return taken;
}

export function onPushRewardOpen(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
