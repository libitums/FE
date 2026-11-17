// 휴대폰 키보드 자리 높이입니다. 입력 칸이 알린 실제 키보드 높이(`keyboardheightchange`, 레이아웃 단위로 바꾼 값)가 있으면 그 값,
// 없으면 기기에 남은 지난 값, 그것도 없으면 화면 높이 표(`resolveChatKeyboardHeight`)입니다. 표는 추정이라 툴바 · 추천 줄이 붙은
// 키보드(Gboard · 삼성 키보드 툴바 등)는 표보다 높아 입력 줄을 덮었습니다 — 잰 값은 기기에 적어 다음 방부터 첫 자리를 맞춥니다.
// 0(키보드가 내려감)은 지우지 않습니다 — 자리는 초점 · 슬롯이 접고, 학습 키보드 · 보기 판은 같은 높이를 이어 씁니다.

import { useState } from "@lynx-js/react";

import { resolveChatKeyboardHeight } from "./keyboard-height";
import type { KeyboardHeightStore } from "./keyboard-ports";

export type PhoneKeyboardHeight = {
  readonly height: number;
  /** 입력 칸이 잰 높이(pt/dp)를 받습니다. 유한한 양수만 반영합니다. */
  readonly measure: (height: number) => void;
};

export function usePhoneKeyboardHeight(
  store: KeyboardHeightStore,
  screenHeight: number,
  bottomInset: number,
): PhoneKeyboardHeight {
  const [measured, setMeasured] = useState<number | null>(null);
  const measure = (height: number) => {
    if (!Number.isFinite(height) || height <= 0) return;
    setMeasured(height);
    store.write(height);
  };
  const height = resolveChatKeyboardHeight({
    stored: measured ?? store.read(),
    screenHeight,
    bottomInset,
  });
  return { height, measure };
}
