// 보기 로마자(ADR-0108 D3) · 진동(ADR-0109 D4) 설정의 기기 저장입니다. 세션 옵션 넷 중 이 둘만 기기에 남깁니다 —
// 나머지 둘(자동 재생 · 대본 표시)은 세션마다 초기값으로 시작합니다. 기기 범위라 로그아웃 · 계정 삭제에서
// 지우지 않습니다(`libitum.ui.language`와 같은 줄).

import {
  initialSessionOptions,
  type SessionOptionKey,
  type SessionOptions,
} from "./session-options";
import { getItem, setItem } from "./storage";

export const choiceRomanizationStorageKey = "libitum.session-option.show-choice-romanization";
export const vibrationStorageKey = "libitum.session-option.vibration";

const storageKeyOf: Partial<Record<SessionOptionKey, string>> = {
  "show-choice-romanization": choiceRomanizationStorageKey,
  vibration: vibrationStorageKey,
};

/** 저장값을 켬/끔으로 읽습니다. 정확히 `"off"`일 때만 끔이고, 나머지(없음 · 깨진 값)는 기본값 켬입니다. */
export function storedChoiceRomanizationFrom(stored: unknown): boolean {
  return stored !== "off";
}

// 저장소 접점 — `storage.ts`는 저장소가 없으면(Explorer · 테스트) 읽기 null · 쓰기 무시입니다. 던지지 않게 감쌉니다.
function readStored(key: string): unknown {
  try {
    return getItem(key);
  } catch {
    return null;
  }
}

/** 초기값에 저장된 보기 로마자 · 진동 값을 얹습니다. 읽기가 실패하면 초기값 그대로입니다. */
export function loadSessionOptions(): SessionOptions {
  return {
    ...initialSessionOptions,
    "show-choice-romanization": storedChoiceRomanizationFrom(
      readStored(choiceRomanizationStorageKey),
    ),
    vibration: storedVibrationEnabled(),
  };
}

/** 지금 저장된 진동 설정입니다 — 효과음이 판정마다 읽습니다. 정확히 `"off"`일 때만 끔, 나머지는 켬입니다. */
export function storedVibrationEnabled(): boolean {
  return readStored(vibrationStorageKey) !== "off";
}

/** 저장 대상(보기 로마자 · 진동)만 씁니다. 다른 키는 아무것도 하지 않습니다. 쓰기 실패는 이번 실행의 선택만 잃습니다. */
export function saveSessionOption(key: SessionOptionKey, value: boolean): void {
  const storageKey = storageKeyOf[key];
  if (storageKey === undefined) return;
  try {
    setItem(storageKey, value ? "on" : "off");
  } catch {
    // 쓰기 실패는 이번 실행의 선택만 잃습니다 — 다음 실행은 기본값(켬)으로 시작합니다.
  }
}
