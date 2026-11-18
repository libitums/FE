// 추천 친구의 순수 판정입니다 — 보이는 친구(서버 ∩ 인물 표) · 추천 줄 · 성인 확인 대화상자 · 프로필 시트 모델.

import type {
  ChatFriend,
  ChatFriendsState,
  FriendProfileModel,
  ProfileLanguage,
} from "./chat-friends.contract";
import type { ChatBirthYear } from "./chat-source.contract";
import { profileTextFor } from "./companion-profile-l10n";
import { COMPANION_CHARACTERS, companionCharacterOf } from "./companion-roster";

/**
 * 서버 목록 ∩ 인물 표의 추천 친구 — 인물 표 순서, 등급은 서버 값. 서버 목록을 못 받았으면(null) 아무도 보이지 않습니다.
 * 이야기 인물 id가 서버 목록에 섞여 와도 친구로 보이지 않습니다.
 */
export function visibleFriendsOf(server: readonly ChatFriend[] | null): readonly ChatFriend[] {
  if (server === null) return [];
  const visible: ChatFriend[] = [];
  for (const character of COMPANION_CHARACTERS) {
    if (character.kind !== "friend") continue;
    const listed = server.find((friend) => friend.id === character.id);
    if (listed !== undefined) visible.push({ id: character.id, romanceTier: listed.romanceTier });
  }
  return visible;
}

/** 추천 줄의 카드 — 보이는 친구 가운데 아직 추가하지 않은 친구. 비면 줄이 서지 않습니다. */
export function stripFriendsOf(state: ChatFriendsState | null): readonly ChatFriend[] {
  if (state === null) return [];
  return state.visible.filter((friend) => !state.added.includes(friend.id));
}

export type AgeBand = "adult" | "minor" | "unknown";

/** 서버 `companion.age_band`와 같은 셈 — (올해 − 생년) ≥ 18이면 성인. 생년이 없으면(건너뜀 · 안 물음) 모름. */
export function ageBandOf(birthYear: ChatBirthYear, nowYear: number): AgeBand {
  if (birthYear.kind !== "set") return "unknown";
  return nowYear - birthYear.year >= 18 ? "adult" : "minor";
}

/**
 * 친구를 추가할 때 성인 확인 대화상자를 띄울지 — 서버 등급 open · 생년상 성인 · 아직 확인 안 함(모름 포함) 셋 다일 때만.
 * 나이 모름은 대화상자도, 생년을 넣으라는 안내도 없습니다. 미성년자는 open 친구를 받지 않지만 받더라도 띄우지 않습니다.
 */
export function adultAckNeeded(input: {
  readonly tier: ChatFriend["romanceTier"];
  readonly birthYear: ChatBirthYear;
  readonly adultAck: boolean | null;
  readonly nowYear: number;
}): boolean {
  if (input.tier !== "open" || input.adultAck === true) return false;
  return ageBandOf(input.birthYear, input.nowYear) === "adult";
}

/**
 * 프로필 시트 모델 — 아홉 인물 모두. `addable`이면 「친구 추가」 단추가 섭니다(추천 줄에서 연 아직 추가 안 한 친구만).
 * 인물 표에 없으면 null.
 */
export function friendProfileModel(
  characterId: string,
  options: { readonly language: ProfileLanguage; readonly addable: boolean },
): FriendProfileModel | null {
  const character = companionCharacterOf(characterId);
  const text = profileTextFor(characterId, options.language);
  if (character === null || text === null) return null;
  const { profile } = character;
  return {
    id: character.id,
    name: character.name,
    avatarPath: character.avatarPath,
    age: profile.age,
    job: { ko: profile.job.ko, translated: text.job },
    mbti: profile.mbti,
    bio: { ko: profile.bio.ko, translated: text.bio },
    canAdd: options.addable && character.kind === "friend",
  };
}

/**
 * 목록 줄 · 방 머리 아바타가 프로필 시트를 열 수 있나 — 열린 방이고 인물 표에 있는 인물만(잠긴 이야기 인물은 어디서도 새로 보이지
 * 않습니다). 가짜 출처의 연습 방(인물 표 밖)은 열지 않습니다.
 */
export function profileOpensFrom(room: {
  readonly access: { readonly kind: string };
  readonly counterpart: { readonly id: string };
}): boolean {
  return room.access.kind === "open" && companionCharacterOf(room.counterpart.id) !== null;
}

/** 서버가 더는 보이지 않게 한 추가한 친구 — 방은 남고 대화는 서버의 not_available 처리를 따릅니다. 목록을 못 받았으면 false. */
export function friendWithdrawn(characterId: string, state: ChatFriendsState | null): boolean {
  if (state === null || state.status !== "ready") return false;
  return (
    state.added.includes(characterId) && !state.visible.some((friend) => friend.id === characterId)
  );
}

/** 추천 줄 카드 하나 — 아바타는 출처가 푼 주소(방 요약의 상대), 태그는 화면 언어의 직업. */
export type FriendCard = {
  readonly id: string;
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly tag: string;
};

/** 추천 줄 카드들 — 방이 없는(지운) 친구는 뺍니다(추가할 방이 없음). */
export function friendCardsOf(
  state: ChatFriendsState | null,
  rooms: readonly {
    readonly roomId: string;
    readonly counterpart: { readonly name: string; readonly avatarUrl: string | null };
  }[],
  language: ProfileLanguage,
): readonly FriendCard[] {
  const cards: FriendCard[] = [];
  for (const friend of stripFriendsOf(state)) {
    const room = rooms.find((candidate) => candidate.roomId === friend.id);
    const text = profileTextFor(friend.id, language);
    if (room === undefined || text === null) continue;
    const { name, avatarUrl } = room.counterpart;
    cards.push({ id: friend.id, name, avatarUrl, tag: text.job });
  }
  return cards;
}

export type FriendAddPlan =
  | { readonly kind: "add" }
  | { readonly kind: "confirm-adult" }
  /** 보이지 않거나 이미 추가한 친구 — 단추가 없어야 하지만 눌려도 아무것도 하지 않습니다. */
  | { readonly kind: "none" };

/** 「친구 추가」를 눌렀을 때 — 성인 확인이 필요하면 대화상자 먼저(확인 · 취소 모두 추가로 이어집니다). */
export function friendAddPlan(input: {
  readonly state: ChatFriendsState | null;
  readonly characterId: string;
  readonly birthYear: ChatBirthYear;
  readonly nowYear: number;
}): FriendAddPlan {
  const { state, characterId } = input;
  const friend = stripFriendsOf(state).find((candidate) => candidate.id === characterId);
  if (friend === undefined || state === null) return { kind: "none" };
  const ask = adultAckNeeded({
    tier: friend.romanceTier,
    birthYear: input.birthYear,
    adultAck: state.adultAck,
    nowYear: input.nowYear,
  });
  return ask ? { kind: "confirm-adult" } : { kind: "add" };
}
