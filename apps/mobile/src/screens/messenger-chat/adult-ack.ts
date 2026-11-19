// 성인 확인 창의 판정입니다(ADR-0163 D4 · 「앱 인계」). 순수.
// 창은 넷이 모두 맞을 때만 한 번: 일반 인물 · 서버 수위 open · 생년상 성인 · 프로필 `adultAck`가 참이 아님.
// 나이 모름(물어보지 않음 · 건너뜀)은 성인이 아니다 — 창도, 생년을 넣으라는 안내도 없습니다(버린 대안 3).

import type { ChatBirthYear } from "./chat-source.contract";
import type { FriendKind, RomanceTier } from "./friend-catalog.contract";

/** 서버 `companion.age_band`와 같은 선 — 올해 − 생년 ≥ 18이면 성인(20261109 마이그레이션). */
export const ADULT_AGE = 18;

/** 생년상 성인인가 — 생년을 모르면 거짓. */
export function isAdultByBirthYear(birthYear: ChatBirthYear, now: number): boolean {
  if (birthYear.kind !== "set") return false;
  return new Date(now).getFullYear() - birthYear.year >= ADULT_AGE;
}

export type AdultAckInput = {
  readonly kind: FriendKind;
  /** 서버가 준 인물 수위 — 목록에 없거나 모르면 null. */
  readonly romanceTier: RomanceTier | null;
  readonly birthYear: ChatBirthYear;
  readonly now: number;
  /** 서버 프로필의 동의 — undefined = 아직 안 읽음, null = 못 읽음. */
  readonly adultAck: boolean | null | undefined;
};

/** skip = 창 없이 추가, read = 동의를 먼저 읽음(다시 판정), prompt = 창을 띄움(확인 · 취소 모두 추가). */
export type AdultAckStep = "skip" | "read" | "prompt";

export function adultAckStepOf(input: AdultAckInput): AdultAckStep {
  if (input.kind !== "general" || input.romanceTier !== "open") return "skip";
  if (!isAdultByBirthYear(input.birthYear, input.now)) return "skip";
  if (input.adultAck === undefined) return "read";
  // 못 읽음(null)은 동의가 있는지 모릅니다 — 묻는 쪽으로(동의가 있으면 서버가 같은 값을 다시 적을 뿐입니다).
  return input.adultAck === true ? "skip" : "prompt";
}
