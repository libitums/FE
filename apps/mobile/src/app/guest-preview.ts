// 비회원 메신저 미리보기의 판정입니다(ADR-0166) — 세션이 없고 비회원 표식이 있으면 회원과 같은 인물 방을 서버 없이 봅니다.
// 배경 전용 라이브러리를 값으로 가져오지 않습니다(저장소 읽기만).

import { loadAuthSession } from "../lib/auth-session";
import { loadGuestSession } from "../lib/guest-session";
import type {
  ChatFixtureSeed,
  FixtureChatSourceOptions,
} from "../screens/messenger-chat/chat-source.contract";
import { guestCompanionSeed } from "../screens/messenger-chat/companion-roster";

/** 비회원 출처의 모드 이름 — 회원(「server:<id>」) · 테스트 가짜(「fixture」)와 출처를 나눕니다. */
export const GUEST_PREVIEW_MODE = "guest-preview";

export function isGuestPreview(): boolean {
  return loadAuthSession() === null && loadGuestSession();
}

/**
 * 서버 없는 출처의 씨앗 선택지 — 테스트 씨앗이 있으면 그것, 비회원이면 앱 인물 표 + 열 때 첫 인사, 아니면 없음(기본 데모 씨앗).
 */
export function localSeedOptions(
  testSeed: ChatFixtureSeed | undefined,
  guest: boolean,
): Pick<FixtureChatSourceOptions, "seed" | "greetOnOpen"> {
  if (testSeed !== undefined) return { seed: testSeed };
  return guest ? { seed: guestCompanionSeed(), greetOnOpen: true } : {};
}
