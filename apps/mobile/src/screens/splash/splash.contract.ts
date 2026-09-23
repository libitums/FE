// 스플래시는 나가는 수단이 없습니다. 전이 계기는 고정 시간이 아니라 로고
// 애니메이션이 끝났을 때입니다(2026-09-21 디자인 반영). `entrySplashDurationMs`는
// 그 신호가 오지 않을 때를 받치는 **최대 체류 시간**입니다. prop 이름 `onTimeout`은
// App 결선과 통합 테스트가 붙잡고 있어 그대로 둡니다.

export type SplashScreenProps = { readonly onTimeout: () => void };

export type SplashTestId = "splash-screen-logo";
