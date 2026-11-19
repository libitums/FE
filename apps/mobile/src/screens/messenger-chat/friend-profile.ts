// 인물 프로필의 순수 판정입니다(ADR-0162 2026-11-19 추가) — 사실 줄(나이 · 직업 · MBTI) · 목소리 견본 주소 · 방 머리 프로필 모델.

import type { ChatRoomAccess } from "./chat-source.contract";
import type { FriendCatalog, FriendFacts } from "./friend-catalog.contract";
import type { FriendProfileCopy } from "./friend-profile.contract";
import type { SuggestedFriendSheetModel } from "./suggested-friends.contract";
import { localizedLine } from "./suggested-friends";

const DECADE = /^(\d{1,3})s$/;
const RANGE = /^(\d{1,3})-(\d{1,3})$/;

/** 나이 표기 — 수 · 나이대(`"30s"`) · 범위(`"25-26"`). 모르는 모양 · 빈 값은 null(그 조각을 뺍니다). */
export function ageTextOf(age: FriendFacts["age"], copy: FriendProfileCopy): string | null {
  if (typeof age === "number") return Number.isInteger(age) && age > 0 ? copy.age(age) : null;
  if (age === null) return null;
  const decade = DECADE.exec(age);
  if (decade !== null) return copy.ageDecade(Number(decade[1]));
  const range = RANGE.exec(age);
  if (range !== null) return copy.ageRange(Number(range[1]), Number(range[2]));
  return null;
}

/** 사실 줄 — 있는 조각만(나이 · 직업 · MBTI). 하나도 없으면 null(줄을 그리지 않습니다). 직업은 그 언어, 없으면 en. */
export function profileFactsOf(
  facts: FriendFacts,
  copy: FriendProfileCopy,
  language: string,
): string | null {
  const job = facts.job === null ? "" : localizedLine(facts.job, language).trim();
  const parts = [ageTextOf(facts.age, copy) ?? "", job, facts.mbti?.trim() ?? ""].filter(
    (part) => part !== "",
  );
  return parts.length === 0 ? null : copy.facts(parts);
}

/** 견본 주소 — 경로가 없거나 주소를 만들 수 없으면 null(단추가 서지 않습니다). */
export function voiceUrlOf(
  facts: FriendFacts,
  mediaUrlOf: ((path: string) => string | null) | undefined,
): string | null {
  if (facts.voiceSamplePath === null || mediaUrlOf === undefined) return null;
  return mediaUrlOf(facts.voiceSamplePath);
}

export type RoomProfileInput = {
  readonly catalog: FriendCatalog;
  readonly counterpart: { readonly id: string; readonly avatarUrl: string | null };
  /** 대화 스냅숏의 그 방 접근 — 방이 없으면 null. */
  readonly access: ChatRoomAccess | null;
  readonly mediaUrlOf?: (path: string) => string | null;
};

/**
 * 방 머리에서 여는 읽기 전용 프로필 — **열린 방**이고 카탈로그에 그 인물이 있을 때만(아홉 모두). 그 밖은 null(제목을 누를 수 없음).
 * 추가 · 먼저 만나기 단추가 없고, 첫 말 말풍선도 없습니다(이미 대화 중).
 */
export function roomProfileModelOf(input: RoomProfileInput): SuggestedFriendSheetModel | null {
  if (input.access?.kind !== "open") return null;
  const character = input.catalog.characters.find(
    (candidate) => candidate.id === input.counterpart.id,
  );
  if (character === undefined) return null;
  return {
    character,
    avatarUrl: input.counterpart.avatarUrl,
    status: "addable",
    offer: null,
    mode: "profile",
    voiceUrl: voiceUrlOf(character.profile, input.mediaUrlOf),
  };
}
