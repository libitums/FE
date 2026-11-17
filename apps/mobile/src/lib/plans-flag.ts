// 요금제 화면 · 입구의 기능 플래그(ADR-0144). 2026-11-17부터 **켬** — 결제 전 미리보기(추가 2026-11-17): 요금제 · 임시 추천 가격을
// 보이고, 구매 단추는 「곧」 안내 + 구매 의향 이벤트로 끝납니다. 실제 결제를 여는 것은 구매 다리(`PurchaseBridge.available`)이고, 2단계
// (RevenueCat 네이티브 다리)가 붙기 전까지 꺼진 다리입니다.

export function plansFeatureEnabled(): boolean {
  return true;
}
