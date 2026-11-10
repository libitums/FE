// 네이티브 자리 포트입니다(messenger-chat-ui spec §5.2). 1단계 구현은 늘 모름 · 늘 없음입니다.

export type KoreanKeyboardPresence = "present" | "absent" | "unknown";
export type KoreanKeyboardProbe = { readonly presence: () => KoreanKeyboardPresence };
export type KeyboardHeightStore = { readonly read: () => number | null };

export const unknownKoreanKeyboardProbe: KoreanKeyboardProbe = {
  presence: () => "unknown",
};

export const emptyKeyboardHeightStore: KeyboardHeightStore = {
  read: () => null,
};
