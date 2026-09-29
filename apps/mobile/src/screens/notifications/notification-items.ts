// 알림 화면의 임시 입력값 자리입니다 — 알림 항목 넷과 조회 함수
// `notificationItems`를 소유합니다.

import type { NotificationItem } from "./notifications.contract";

// ⚠ 이음매입니다(「임시 입력값의 이음매」 — `docs/conventions/code.md`).
//
// **무엇이 임시인가** — 아래 네 항목의 `id` · `message` · `target` 전부와
// 개수(4)입니다. `NotificationItem` 타입과 행선지 낱말(문구표 `notifications.destination`)은
// 임시가 아닙니다.
//
// **무엇이 막고 있나** — 알림 내용의 실제 출처가 없습니다. 서버·API가 없고,
// 출처를 어떻게 정할지는 이 범위 밖입니다.
//
// **진짜가 오는 날 무엇만 바뀌나** — 이 함수의 본문(값과 그 출처)뿐입니다.
// 형태 · 화면 · App 결선은 안 바뀝니다. 공급이 비동기가 되면 그날 `state-data`
// 계층이 섭니다.
//
// **이 목록이 배정·순서의 근거가 아닙니다** — 넷은 대상 종류마다 하나를 둔
// 판정용 값입니다. 몇 건이 오늘 실제로 있는지를 말하지 않습니다.
//
// export하지 않습니다 — 표를 내보내면 다음 사람이 직접 색인해 자기 답을
// 짓습니다(`culture-quiz.ts` 선례). 순서는 여정의 특별 유닛 순서 셋 →
// 롤플레이입니다.
const items: readonly NotificationItem[] = [
  {
    id: "notification-messenger",
    message: "Jimin sent you an appointment message",
    target: { kind: "messenger", unitId: "appointment-confirmation" },
  },
  {
    id: "notification-phone-call",
    message: "Jimin is calling about your appointment",
    target: { kind: "phone-call", unitId: "appointment-confirmation-phone-call" },
  },
  {
    id: "notification-visual-novel",
    message: "Jimin has arrived at the café",
    target: { kind: "visual-novel", unitId: "cafe-arrival-visual-novel" },
  },
  {
    id: "notification-roleplay-list",
    message: "Practice what you learned in a roleplay",
    target: { kind: "roleplay-list" },
  },
];

export function notificationItems(): readonly NotificationItem[] {
  return items;
}
