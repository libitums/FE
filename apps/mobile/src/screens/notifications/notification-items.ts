// 알림 화면의 임시 입력값 자리 (「임시 입력값의 이음매」 — docs/conventions/code.md).
//
// 계약: .agent-harness/work/lib-257/spec.md §0.3 D-d · §2.4.
//
// **무엇이 임시인가** — 아래 네 항목의 `id` · `message` · `target` 전부와 개수(4).
// `NotificationItem` 타입과 행선지 낱말 표(`notifications.ts`)는 임시가 아니다.
//
// **무엇이 막고 있나** — 알림 내용의 실제 출처가 없다. 서버·API가 없고, 출처를
// 어떻게 정할지는 이 이슈 범위 밖이다(requirements scope_out).
//
// **진짜가 오는 날 무엇만 바뀌나** — 이 함수의 본문(값과 그 출처)뿐이다. 형태 ·
// 화면 · App 결선은 안 바뀐다. 공급이 비동기가 되면 그날 `state-data` 계층이 선다.
//
// **이 목록이 배정·순서의 근거가 아니다** — 넷은 대상 종류마다 하나를 둔 판정용
// 값이다. 몇 건이 오늘 실제로 있는지를 말하지 않는다.

import type { NotificationItem } from "./notifications.contract";

// export하지 않는다 — 표를 내보내면 다음 사람이 직접 색인해 자기 답을 짓는다
// (culture-quiz.ts 선례). 순서는 여정의 특별 유닛 순서 셋 → 롤플레이(계약 §0.3 D-d).
const items: readonly NotificationItem[] = [
  {
    id: "notification-messenger",
    message: "지민이 약속 확인 메시지를 보냈어요",
    target: { kind: "messenger", unitId: "appointment-confirmation" },
  },
  {
    id: "notification-phone-call",
    message: "지민에게서 약속 확인 전화가 왔어요",
    target: { kind: "phone-call", unitId: "appointment-confirmation-phone-call" },
  },
  {
    id: "notification-visual-novel",
    message: "지민이 카페에 도착했어요",
    target: { kind: "visual-novel", unitId: "cafe-arrival-visual-novel" },
  },
  {
    id: "notification-roleplay-list",
    message: "배운 대화를 롤플레이로 연습해 보세요",
    target: { kind: "roleplay-list" },
  },
];

export function notificationItems(): readonly NotificationItem[] {
  return items;
}
