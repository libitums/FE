// 에피소드를 열 때의 받기 시트(ADR-0095 D6 · D7)의 상태 · props 타입입니다. 구현 · JSX는 두지 않습니다.

export type DownloadSheetState =
  /** 모바일 데이터 · 정책 `ask` — 받을지 묻습니다. `sizeBytes`는 목록에 크기가 있을 때. */
  | { readonly kind: "ask"; readonly ordinal: number; readonly sizeBytes: number | null }
  /** 모바일 데이터 · 정책 `wifi-only` — Wi-Fi에서 받는다는 안내만. */
  | { readonly kind: "wifi-only"; readonly ordinal: number }
  /** 오프라인 — 열 수 있는 편(본문이 기기에 있음)이면 「그냥 열기」를 함께 둡니다. */
  | { readonly kind: "offline"; readonly ordinal: number; readonly canOpenAnyway: boolean };

export type DownloadSheetProps = {
  readonly state: DownloadSheetState;
  /** 「지금 받기」 — `dontAskAgain`이면 정책을 `always`로. */
  readonly onDownloadNow: (dontAskAgain: boolean) => void;
  /** 「Wi-Fi에서 받기」 — `dontAskAgain`이면 정책을 `wifi-only`로. */
  readonly onWifiLater: (dontAskAgain: boolean) => void;
  readonly onOpenAnyway: () => void;
  readonly onClose: () => void;
};
