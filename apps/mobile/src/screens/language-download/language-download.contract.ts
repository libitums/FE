// 앱 언어를 바꾼 뒤 그 언어의 번역 파일을 받는 시트의 계약입니다(ADR-0102 개정 ⟨언어 바꿈 받기⟩).

/** 시트의 상태 — 받는 중(끝낸 편 · 받을 편 · 받을 크기) · 오프라인(연결되면 받음) · 실패(다시 시도 · 나중에). */
export type LanguageDownloadState =
  | {
      readonly kind: "downloading";
      readonly done: number;
      readonly total: number;
      readonly bytes: number;
    }
  | { readonly kind: "offline" }
  | { readonly kind: "failed" };

export type LanguageDownloadSheetProps = {
  readonly state: LanguageDownloadState;
  /** 받는 중 — 받기는 이어 가고 시트만 닫습니다. */
  readonly onHide: () => void;
  readonly onRetry: () => void;
  /** 실패 · 오프라인에서 닫기 — 오프라인이면 연결이 돌아올 때 받습니다. */
  readonly onClose: () => void;
};
