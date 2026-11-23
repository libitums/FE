// 누른 서버 푸시의 보상 신호(ADR-0175) — 누른 알림에 실린 캠페인 id를 지도 안내(`use-push-reward`)에
// 넘깁니다. 누름은 앱 구간에 들어선 뒤 `use-opened-push`가 꺼내므로, 안내 훅이 아직 서지 않았어도 다음 구독 때 꺼낼 수 있게 들고 있습니다.
// background 스레드(효과 · 전역 이벤트)에서만 부릅니다.

import type { PushNotificationTarget } from "../screens/notifications/notifications.contract";

export type PushRewardOpen = { readonly campaignId: string };

let pending: PushRewardOpen | null = null;
const listeners = new Set<() => void>();

/** 캠페인 id가 실린 여정 맵 알림만 신호입니다 — id 없는 알림은 어느 보상도 가리키지 않아 묻지 않습니다. */
export function notePushRewardOpen(target: PushNotificationTarget): void {
  if (target.kind !== "journey-map" || target.campaignId === undefined) return;
  pending = { campaignId: target.campaignId };
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
