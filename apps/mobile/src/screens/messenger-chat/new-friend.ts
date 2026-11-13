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
 * 에피소드 → 해금 인물 표입니다. 정본은 기획 해금 JSON(`docs/content/companion-unlocks.json`, ADR-0141 — 2026-11-13 「해금 json
 * 기준으로」): 그 에피소드를 끝내고(completion 전부 · 최종 테스트 통과) 뒤 컷까지 본 뒤 열립니다 — 연락처 교환이 모두 뒤 컷에
 * 있습니다(전에는 막간 INT). 열쇠는 에피소드 id이고, 표가 JSON과 어긋나면 CU-U1이 실패합니다.
 */
export const CHARACTER_UNLOCKS: readonly CharacterUnlockEntry[] = [
  {
    episodeId: "u01-water",
    characterId: "yoonkyung",
    roomId: "yoonkyung",
    sceneImagePath: "content/images/u01-water/pre-1.webp",
    faceImagePath: "content/images/profiles/yoonkyung-casual.webp",
  },
  {
    episodeId: "u03-mina",
    characterId: "mina",
    roomId: "mina",
    sceneImagePath: "content/images/u03-mina/pre-1.webp",
    faceImagePath: "content/images/profiles/mina-casual.webp",
  },
  {
    episodeId: "u12-cafe-missed",
    characterId: "doyun",
    roomId: "doyun",
    sceneImagePath: "content/images/u12-cafe-missed/pre-1.webp",
    faceImagePath: "content/images/profiles/doyun-casual.webp",
  },
  {
    episodeId: "u17-samgyeopsal",
    characterId: "jaemin",
    roomId: "jaemin",
    sceneImagePath: "content/images/u17-samgyeopsal/pre-1.webp",
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
