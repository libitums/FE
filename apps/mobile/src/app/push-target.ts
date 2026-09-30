// 서버 푸시의 `target`(검증 전 값)을 앱이 아는 목적지로 읽습니다(ADR-0034). 유닛 ID는 이 앱에 **있는** 것만
// 받습니다 — 표가 유닛 타입의 모든 값을 키로 가져야 컴파일되므로, 유닛이 늘면 여기서 섭니다.

import type { MessengerUnitId } from "../screens/messenger/messenger.contract";
import type { PushNotificationTarget } from "../screens/notifications/notifications.contract";
import type { PhoneCallUnitId } from "../screens/phone-call/phone-call.contract";
import type { VisualNovelUnitId } from "../screens/visual-novel/visual-novel.contract";

const messengerUnits: Record<MessengerUnitId, true> = { "appointment-confirmation": true };
const phoneCallUnits: Record<PhoneCallUnitId, true> = {
  "appointment-confirmation-phone-call": true,
};
const visualNovelUnits: Record<VisualNovelUnitId, true> = { "cafe-arrival-visual-novel": true };

const has = <Id extends string>(table: Record<Id, true>, id: unknown): id is Id =>
  typeof id === "string" && Object.prototype.hasOwnProperty.call(table, id);

/** 모르는 목적지 · 없는 유닛 · 모양 오류는 `null`입니다. 빈 사전(목적지 없는 알림)은 여정 맵입니다. */
export function pushTargetFrom(raw: unknown): PushNotificationTarget | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const kind = record["kind"];
  const unitId = record["unitId"];
  switch (kind) {
    case undefined:
      return Object.keys(record).length === 0 ? { kind: "journey-map" } : null;
    case "journey-map":
    case "notifications":
    case "roleplay-list":
      return { kind };
    case "messenger":
      return has(messengerUnits, unitId) ? { kind, unitId } : null;
    case "phone-call":
      return has(phoneCallUnits, unitId) ? { kind, unitId } : null;
    case "visual-novel":
      return has(visualNovelUnits, unitId) ? { kind, unitId } : null;
    default:
      return null;
  }
}
