// 무제한 판정 — 레슨 티켓을 쓰지 않는가 · 대화 관문을 여는가. 시험 계정(ADR-0085)이거나 서버 권한(ADR-0144 D2)이 그 무제한일 때.
// 잠금(유닛 열림)은 시험 계정만 풉니다 — 그쪽은 `isTesterAccessActive`를 그대로 읽습니다.

import { planChatTier, planUnlimitedTickets } from "./plan-access";
import { isTesterAccessActive } from "./tester-access";

/** 레슨 티켓을 쓰지 않는가 — 시험 계정 · 티켓 무제한 구독(Unlimited Tickets · Premium). */
export function ticketsUnlimited(): boolean {
  return isTesterAccessActive() || planUnlimitedTickets();
}

/** 앱의 대화 관문을 여는 등급인가입니다 — 시험 계정이거나 대화 무제한 구독(Premium, ADR-0144 D6). Chat Plus의 하루 무료 수는 서버가 셉니다. */
export function chatUnlimited(): boolean {
  return isTesterAccessActive() || planChatTier() === "premium";
}
