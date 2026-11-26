// 시간 한정 무제한 티켓의 지금 끝 시각입니다 — 보상으로 받은 것(ADR-0175 P8 · P9)과 첫날 이용권(ADR-0186) 둘. 지도 안내
// (`use-push-reward`) · 첫날 결선(`use-welcome-pass`, 회원만)이 효과 · 응답에서 맞추고(렌더 본문에서는 쓰지 않음) `ticketsUnlimited()`가 읽습니다.
// 테스트는 끝에 0으로 되돌립니다.

let passUntilMs = 0;
let welcomeUntilMs = 0;

export function setRewardTicketPass(untilMs: number): void {
  passUntilMs = untilMs;
}

/** 첫날 이용권(회원만)의 끝 시각 — 없으면 0. 푸시 보상 이용권과 따로 듭니다. 첫날 결선이 세션을 따라 맞춥니다(로그아웃이면 0). */
export function setWelcomeTicketPass(untilMs: number): void {
  welcomeUntilMs = untilMs;
}

/** 지금 시간 한정 무제한 티켓이 살아 있나 — 둘 중 하나라도. */
export function rewardTicketPassActive(nowMs: number): boolean {
  return passUntilMs > nowMs || welcomeUntilMs > nowMs;
}
