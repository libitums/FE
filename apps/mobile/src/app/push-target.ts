// 서버 푸시의 `target`(검증 전 값)을 앱이 아는 목적지로 읽습니다(ADR-0034).

import type { PushNotificationTarget } from "../screens/notifications/notifications.contract";

/** 모르는 목적지 · 모양 오류는 `null`입니다. 빈 사전(목적지 없는 알림)은 여정 맵입니다. */
export function pushTargetFrom(raw: unknown): PushNotificationTarget | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const kind = record["kind"];
  switch (kind) {
    case undefined:
      return Object.keys(record).length === 0 ? { kind: "journey-map" } : null;
    case "journey-map":
    case "notifications":
    case "roleplay-list":
      return { kind };
    // 서버가 아직 보내는 특별 유닛 목적지입니다 — 그 화면은 없어 앱은 여정 맵을 엽니다(ADR-0034).
    case "messenger":
    case "phone-call":
    case "visual-novel":
      return { kind: "journey-map" };
    default:
      return null;
  }
}
