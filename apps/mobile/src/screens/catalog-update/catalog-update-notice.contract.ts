// 끝낸 에피소드 업데이트 안내 대화상자의 계약입니다 — 시안 G-A(가운데 대화상자).

export type CatalogUpdateNoticeCopy = {
  readonly title: string;
  readonly body: string;
  readonly confirm: string;
  readonly dontShowAgain: string;
  /** 체크 행의 낭독 상태. */
  readonly checked: string;
  readonly unchecked: string;
};

export type CatalogUpdateNoticeDialogProps = {
  /** 「Cool, got it」 · 시스템 뒤로 — `muted`는 「Don't show this again」 체크 여부입니다. */
  readonly onClose: (muted: boolean) => void;
};

export const catalogUpdateNoticeTestIds = {
  dialog: "catalog-update-notice",
  confirm: "catalog-update-notice-confirm",
  mute: "catalog-update-notice-mute",
} as const;
