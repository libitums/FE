// 답장 도착 토스트의 문구 계약입니다(ADR-0200). 사진 · 음성 미리보기는 「새 메시지 ↓」 알약 문구(`newMessages.label`)를 다시 씁니다.

export type ReplyToastCopy = {
  /** 닫기 단추 낭독. */
  readonly dismiss: string;
  /** 다른 인물 수 표시 — 「+2」. */
  readonly more: (count: number) => string;
  /** 카드 낭독 · 뜰 때 알림 — 이름 · 미리보기 · 다른 인물 수(0이면 붙이지 않음). */
  readonly spoken: (name: string, preview: string, more: number) => string;
};
