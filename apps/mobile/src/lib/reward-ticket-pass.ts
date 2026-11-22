// 보상으로 받은 시간 한정 무제한 티켓(ADR-0175 P8 · P9)의 지금 끝 시각입니다. 지도 안내(`use-push-reward`)가 기록을 바꾸는
// 효과 · 응답에서 맞추고(렌더 본문에서는 쓰지 않음) `ticketsUnlimited()`가 읽습니다. 테스트는 끝에 0으로 되돌립니다.

let passUntilMs = 0;

export function setRewardTicketPass(untilMs: number): void {
  passUntilMs = untilMs;
}

/** 지금 보상 무제한 티켓이 살아 있나. */
export function rewardTicketPassActive(nowMs: number): boolean {
  return passUntilMs > nowMs;
}
