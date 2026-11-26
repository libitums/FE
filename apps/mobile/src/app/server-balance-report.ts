// 서버 지갑 잔액을 머리 엽전 칩에 알리는 한 자리입니다(ADR-0144 2단계). 세션이 등록한 알림(`setMessengerMediaHooks`의
// `onBalance`)을 메신저 결선이 여기에 꽂고, 구매 뒤 · 엽전 사용 뒤 결선들이 여기로 알립니다. import가 없는 잎 모듈이라
// 티켓 훅처럼 메신저 결선을 거꾸로 부를 수 없는 자리(순환 import)에서도 씁니다.

let listener: ((balance: number) => void) | null = null;

/** 메신저 결선만 부릅니다 — 세션 알림이 바뀔 때마다(null = 해제). */
export function setServerBalanceListener(next: ((balance: number) => void) | null): void {
  listener = next;
}

/** 다시 읽은 서버 지갑 잔액을 머리 엽전 칩에 알립니다 — 등록된 알림이 없으면 버립니다. */
export function reportServerBalance(balance: number): void {
  listener?.(balance);
}
