// 추천 친구(ADR-0164)의 판정입니다. 순수 — 카탈로그 · 서버가 준 보이는 친구 · 학습자 상태만 봅니다.

import type {
  AdultAckState,
  AgeBand,
  FriendCatalog,
  FriendProfile,
  RomanceTier,
  VisibleFriend,
} from "./friend-catalog.contract";

/** 서버 `companion.age_band`의 성인 경계 — 그해 연도 − 생년이 이 수 이상이면 성인입니다. */
export const ADULT_AGE = 18;

/**
 * 보이는 친구만 남깁니다 — 이야기 인물은 그대로, 일반 인물은 서버 목록에 있는 것만 서버 순서로(수위는 서버 값). null은 빈 목록과
 * 같습니다(읽기 전 · 못 읽음 · 손님).
 */
export function catalogWithVisibleFriends(
  catalog: FriendCatalog,
  visible: readonly VisibleFriend[] | null,
): FriendCatalog {
  const story = catalog.characters.filter((character) => character.kind === "story");
  const general: FriendProfile[] = [];
  for (const friend of visible ?? []) {
    const found = catalog.characters.find(
      (character) => character.kind === "general" && character.id === friend.id,
    );
    if (found !== undefined) general.push({ ...found, romanceTier: friend.romanceTier });
  }
  return { ...catalog, characters: [...story, ...general] };
}

/** 생년 → 연령대. 서버와 같게 UTC 연도로 셉니다. */
export function ageBandOf(birthYear: number | null, now: number): AgeBand {
  if (birthYear === null) return "unknown";
  return new Date(now).getUTCFullYear() - birthYear >= ADULT_AGE ? "adult" : "minor";
}

/**
 * 성인 확인(「Get closer」 시트)을 물을지 — 수위 open 인물 + 생년상 성인 + 동의 없음 + 이 계정에 아직 묻지 않음일 때만. 나이 모름 ·
 * 미성년자 · 못 읽음은 묻지 않습니다(안내도 없음, ADR-0164).
 */
export function shouldAskAdultAck(input: {
  readonly romanceTier: RomanceTier | undefined;
  readonly state: AdultAckState | null;
  readonly asked: boolean;
}): boolean {
  const { romanceTier, state, asked } = input;
  return (
    romanceTier === "open" &&
    !asked &&
    state !== null &&
    state.ageBand === "adult" &&
    !state.adultAck
  );
}
