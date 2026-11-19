// 비회원 메신저 미리보기의 판정입니다(ADR-0166) — 세션이 없고 비회원 표식이 있으면 회원과 같은 인물 방을 서버 없이 봅니다.
// 배경 전용 라이브러리를 값으로 가져오지 않습니다(저장소 읽기만).

import { loadAuthSession } from "../lib/auth-session";
import { loadGuestSession } from "../lib/guest-session";

/** 비회원 출처의 모드 이름 — 회원(「server:<id>」) · 테스트 가짜(「fixture」)와 출처를 나눕니다. */
export const GUEST_PREVIEW_MODE = "guest-preview";

export function isGuestPreview(): boolean {
  return loadAuthSession() === null && loadGuestSession();
}
