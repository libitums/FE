// 안내 기록의 계정별 칸입니다(사용자 결정 2026-11-27 · ADR-0032 · ADR-0139 · ADR-0054). 메신저 안내 셋(목록 · 방 · 예시, 키보드,
// 탭 NEW)과 학습 문항 안내를 본 기록이 기기에 하나뿐이라, 로그아웃 뒤 같은 기기에서 다른 계정으로 들어오면 안내가 서지 않았습니다.
// 칸은 옛 기기 키 뒤에 `.<계정>`(로그인은 토큰의 사용자 id, 비회원은 `guest`) — 가입 보상 `libitum.signup-reward.<uid>`와 같은 꼴.
// 옛 기기 키는 업데이트 뒤 처음 읽거나 쓰는 사람이 한꺼번에 물려받고 지웁니다. 로그아웃에 남고, 계정 삭제에 그 계정 칸만 지웁니다.

import type { AuthSession } from "./auth-session.contract";
import { loadAuthSession } from "./auth-session";
import { authUserIdFrom } from "./auth-user-id";
import { loadGuestSession } from "./guest-session";
import { getItem, removeItem, setItem } from "./storage";

/** 비회원 칸의 계정 자리 — 진행 · 단어장의 비회원 칸(`…guest`)과 같습니다. Supabase 사용자 id는 UUID라 겹치지 않습니다. */
export const guestGuideOwner = "guest";

/** 업데이트 전의 기기 하나짜리 키 — 계정별 칸의 앞부분이기도 합니다. */
export const legacyGuideKeys: readonly string[] = [
  "libitum.messenger.guide-seen",
  "libitum.messenger.keyboard-guide-seen",
  "libitum.messenger.tab-visited",
  "libitum.learning-item-guides.seen",
];

/** 기록의 주인 — 세션이 표식을 이깁니다. 세션의 토큰에서 id를 못 읽으면 주인이 없습니다(읽지도 쓰지도 않음). 순수. */
export function guideOwnerFrom(session: AuthSession | null, guest: boolean): string | null {
  if (session !== null) return authUserIdFrom(session.accessToken);
  return guest ? guestGuideOwner : null;
}

/** 지금 주인 — 저장된 세션 · 비회원 표식에서. 저장소를 못 읽으면 없음. */
export function currentGuideOwner(): string | null {
  try {
    return guideOwnerFrom(loadAuthSession(), loadGuestSession());
  } catch {
    return null;
  }
}

export const guideRecordKey = (base: string, owner: string): string => `${base}.${owner}`;

function arrayOf(raw: string | null): unknown[] | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as unknown[]) : null;
  } catch {
    return null;
  }
}

/**
 * 두 기록을 합칩니다 — 배열(본 안내 목록)은 합집합(앞쪽 순서 먼저), 표식(`"1"`)은 어느 한쪽이 1이면 1, 한쪽만 있거나 한쪽이
 * 깨졌으면 성한 쪽. 순수.
 */
export function mergedGuideRecord(first: string | null, second: string | null): string | null {
  if (first === null) return second;
  if (second === null) return first;
  const a = arrayOf(first);
  const b = arrayOf(second);
  if (a !== null && b !== null) return JSON.stringify([...new Set([...a, ...b])]);
  if (a === null && b !== null) return second;
  if (a !== null) return first;
  return first === "1" || second === "1" ? "1" : first;
}

function moveInto(fromKey: string, toKey: string): void {
  const from = getItem(fromKey);
  if (from === null) return;
  const merged = mergedGuideRecord(getItem(toKey), from);
  if (merged !== null) setItem(toKey, merged);
  removeItem(fromKey);
}

/** 옛 기기 기록 넷을 이 주인 칸으로 한꺼번에 옮깁니다(이전 1회 — 옮긴 뒤 옛 키가 없어 다음 주인은 받을 것이 없음). */
function claimLegacyGuides(owner: string): void {
  for (const base of legacyGuideKeys) moveInto(base, guideRecordKey(base, owner));
}

/** 이 주인의 기록 — 읽기 전에 옛 기기 기록을 물려받습니다. 저장소 예외는 부르는 쪽이 받습니다. */
export function readGuideRecord(base: string, owner: string): string | null {
  claimLegacyGuides(owner);
  return getItem(guideRecordKey(base, owner));
}

export function writeGuideRecord(base: string, owner: string, value: string): void {
  claimLegacyGuides(owner);
  setItem(guideRecordKey(base, owner), value);
}

/** 비회원이 가입 · 로그인하면(ADR-0111) 비회원 칸을 그 계정 칸에 합쳐 옮기고 비회원 칸을 지웁니다. 던지지 않습니다. */
export function adoptGuestGuides(userId: string): void {
  for (const base of legacyGuideKeys) {
    try {
      moveInto(guideRecordKey(base, guestGuideOwner), guideRecordKey(base, userId));
    } catch {
      // 옮기지 못하면 그 안내만 계정에 한 번 더 섭니다 — 로그인을 막지 않습니다.
    }
  }
}

/** 계정 삭제 뒤처리 — 그 계정 칸과, 아직 아무도 물려받지 않은 옛 기기 기록(지우는 계정이 이 기기의 사용자)을 지웁니다. 던지지 않습니다. */
export function forgetGuideRecords(userId: string): void {
  for (const base of legacyGuideKeys) {
    for (const key of [guideRecordKey(base, userId), base]) {
      try {
        removeItem(key);
      } catch {
        // 지우지 못해도 뒤처리를 멈추지 않습니다 — 그 안내만 다음 계정에 서지 않습니다.
      }
    }
  }
}
