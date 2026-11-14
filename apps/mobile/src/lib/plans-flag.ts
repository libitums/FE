// 요금제 화면 · 입구의 기능 플래그(ADR-0144) — 1단계는 **꺼짐**. 스토어 상품 · RevenueCat · 네이티브 다리가 붙는 2단계에서 켭니다.
// 꺼져 있으면 설정의 Plans 행 · 티켓 대화상자 카드 · 메신저 판 카드가 모두 없고 요금제 RPC도 부르지 않습니다(운영 사용자 변화 없음).

export function plansFeatureEnabled(): boolean {
  return false;
}
