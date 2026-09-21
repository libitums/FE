// LIB-261 specification 계약. 구현·JSX를 두지 않는다. 변경하려면 specification
// 재고정이 필요하다.
//
// 계약: .agent-harness/work/lib-261/spec.md §1(컴포넌트 트리) · §4.5(testid
// 카탈로그). 이 파일은 `logic-scaffold`가 최종본으로 둔다 — 뒤 단계가 타입을 다시
// 정의하지 않는다.
//
// 스플래시는 나가는 수단이 없다(계약 §4.2). 2026-09-21 디자인 반영으로 전이 계기가
// 「고정 시간」에서 「로고 애니메이션이 끝났을 때」로 바뀌었다. `entrySplashDurationMs`는
// 애니메이션이 끝났다는 신호가 오지 않을 때를 받치는 **최대 체류 시간**이다.
// prop 이름 `onTimeout`은 App 결선과 통합 테스트가 붙잡고 있어 그대로 둔다.

export type SplashScreenProps = { readonly onTimeout: () => void };

export type SplashTestId = "splash-screen-logo";
