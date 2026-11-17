// 네이티브 자리 포트입니다(messenger-chat-ui spec §5.2). 한국어 자판 탐지는 늘 모름입니다.
// 높이 저장은 입력 칸이 잰 휴대폰 키보드 높이(`keyboardheightchange`)를 기기에 남겨, 다음에 방을 열 때 첫 자리부터 맞춥니다
// (기기 구현은 `chat-local-stores`의 `deviceKeyboardHeightStore`). 빈 포트는 테스트 · 미리보기용입니다.

export type KoreanKeyboardPresence = "present" | "absent" | "unknown";
export type KoreanKeyboardProbe = { readonly presence: () => KoreanKeyboardPresence };
export type KeyboardHeightStore = {
  readonly read: () => number | null;
  /** 잰 높이(pt/dp, 아래 바깥 인셋 포함)를 적습니다. 유한한 양수만 받습니다. */
  readonly write: (height: number) => void;
};

export const unknownKoreanKeyboardProbe: KoreanKeyboardProbe = {
  presence: () => "unknown",
};

export const emptyKeyboardHeightStore: KeyboardHeightStore = {
  read: () => null,
  write: () => undefined,
};
