// 스플래시는 나가는 수단이 없습니다. 전이 계기는 고정 시간이 아니라 로고
// 애니메이션이 끝났을 때입니다(2026-09-21 디자인 반영). `entrySplashDurationMs`는
// 그 신호가 오지 않을 때 그 순간을 대신하는 안전 타이머입니다. prop 이름 `onTimeout`은
// App 결선과 통합 테스트가 붙잡고 있어 그대로 둡니다.

export type SplashScreenProps = { readonly onTimeout: () => void };

/** 스플래시가 받는 갱신 뷰입니다. plain = 게이지 없음(로고가 끝나면 나감). */
export type SplashUpdateView =
  | { readonly kind: "plain" }
  // 매니페스트 응답 전 — 게이지 없이 로고만 보이고 스플래시는 나가지 않습니다(ADR-0078 D6 정정).
  | { readonly kind: "checking" }
  | { readonly kind: "gauge"; readonly percent: number; readonly hold: "wait" | "release" };

/** App 루트가 내리는 포트입니다. 함수 둘은 백그라운드가 닫아 만듭니다. */
export type SplashUpdatePort = {
  readonly view: SplashUpdateView;
  /** 로고 애니메이션이 끝났음(또는 못 불러옴 · 안전 타이머)을 알립니다. 시각만 적습니다. */
  readonly logoFinished: () => void;
  /** 스플래시가 지금 나갑니다 — 창을 닫고 준비된 교체를 올리고 측정 이벤트를 냅니다. 두 번째부터는 아무것도 하지 않습니다. */
  readonly close: () => void;
};

export type SplashCopy = {
  /** 게이지 아래 글입니다. */
  readonly updating: string;
  /** 게이지의 스크린리더 라벨입니다 — 진행률을 함께 읽습니다. */
  readonly updatingLabel: (percent: number) => string;
};

export type SplashUpdateGaugeProps = { readonly percent: number };

export type SplashTestId =
  | "splash-screen-logo"
  | "splash-update"
  | "splash-update-track"
  | "splash-update-fill"
  | "splash-update-label";
