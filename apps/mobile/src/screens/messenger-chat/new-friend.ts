// 해금 표 · 해금 판정 · 시트 단계 · 시간표입니다(messenger-chat-1-5 spec §4.4). 순수.

export type CharacterUnlockEntry = {
  readonly episodeId: string;
  readonly characterId: string;
  readonly roomId: string;
  readonly sceneImagePath: string;
  readonly faceImagePath: string;
};
export type NewFriendPhase = "waiting" | "typing" | "message" | "closed";
export type NewFriendEvent = "appear" | "typed" | "dismiss";
export type NewFriendTimeline = {
  readonly appearAfterMs: number;
  readonly typingMs: number;
  readonly face: "bounce" | "still";
  readonly dots: "blink" | "still";
};

/**
 * 에피소드 → 해금 인물 표입니다. 그 에피소드의 막간(중간 스페셜 유닛 — 이야기 유닛 `INT`, ADR-0088)을 처음 끝내면 열립니다
 * (2026-11-10 결정 — 전에는 최종 테스트 통과였습니다). 열쇠는 에피소드 id입니다.
 */
export const CHARACTER_UNLOCKS: readonly CharacterUnlockEntry[] = [
  {
    episodeId: "u03-mina",
    characterId: "mina",
    roomId: "mina",
    sceneImagePath: "content/images/u03-mina/pre-1.webp",
    faceImagePath: "content/images/profiles/mina-casual.webp",
  },
  // 서버 인물(ADR-0137, 통합 결정 4) — 그 인물이 처음 상대역인 에피소드의 막간.
  {
    episodeId: "u02-checkin",
    characterId: "yoonkyung",
    roomId: "yoonkyung",
    sceneImagePath: "content/images/u02-checkin/pre-1.webp",
    faceImagePath: "content/images/profiles/yoonkyung-casual.webp",
  },
  {
    episodeId: "u04-directions",
    characterId: "doyun",
    roomId: "doyun",
    sceneImagePath: "content/images/u04-directions/pre-1.webp",
    faceImagePath: "content/images/profiles/doyun-casual.webp",
  },
  {
    episodeId: "u07-jaemin",
    characterId: "jaemin",
    roomId: "jaemin",
    sceneImagePath: "content/images/u07-jaemin/pre-1.webp",
    faceImagePath: "content/images/profiles/jaemin-casual.webp",
  },
];

/** 맵으로 돌아와 끝낸 유닛의 발자국 움직임이 끝난 뒤(표준 2000 ms) · 움직임 줄이기 0.6 s. */
export const NEW_FRIEND_TIMING = {
  standard: { appearAfterMs: 2000, typingMs: 1200 },
  reduced: { appearAfterMs: 600, typingMs: 600 },
} as const;

/** 표에 있고 characterId ∉ unlocked → 그 줄, 아니면 null. */
export function characterUnlockFor(input: {
  readonly episodeId: string;
  readonly unlocked: ReadonlySet<string>;
  readonly table?: readonly CharacterUnlockEntry[];
}): CharacterUnlockEntry | null {
  const entry = (input.table ?? CHARACTER_UNLOCKS).find((e) => e.episodeId === input.episodeId);
  return entry === undefined || input.unlocked.has(entry.characterId) ? null : entry;
}

export function newFriendReducer(phase: NewFriendPhase, event: NewFriendEvent): NewFriendPhase {
  if (phase === "closed" || event === "dismiss") return "closed";
  if (phase === "waiting" && event === "appear") return "typing";
  if (phase === "typing" && event === "typed") return "message";
  return phase;
}

export function newFriendTimelineOf(motion: "standard" | "reduced"): NewFriendTimeline {
  const { appearAfterMs, typingMs } = NEW_FRIEND_TIMING[motion];
  return {
    appearAfterMs,
    typingMs,
    face: motion === "standard" ? "bounce" : "still",
    dots: motion === "standard" ? "blink" : "still",
  };
}

/** message → lit, 그 밖 dim(dim이어도 누를 수 있다). */
export function replyButtonStateOf(phase: NewFriendPhase): "dim" | "lit" {
  return phase === "message" ? "lit" : "dim";
}
