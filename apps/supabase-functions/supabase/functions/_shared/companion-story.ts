// 컴패니언 「지금까지 이야기」 카드와 메신저 비트 고르기(docs/specs/ai-companion-story.md). 순수 함수입니다.
//   카드 — 이 캐릭터가 학습자와 본편에서 겪은 일(끝낸 에피소드만). 대화의 처음, 그리고 **새 대화 세션**(마지막 말 뒤 `sessionGapHours`
//   넘어 다시 온 첫 턴)에 지난 세션보다 진도가 나가 있을 때만 `showTurns` 턴 동안 시스템 프롬프트에 싣는다. 세션 중간에 에피소드를
//   끝내도 다음 세션까지 기다린다. 그 밖의 턴은 대화 요약 · 기억이 맡는다(현실 시간을 사는 메신저라 본편은 「지난번」 일이다).
//   비트 — 진도 구간이 맞고 이 대화에서 아직 안 쓴 화제. 화제 전환 씨앗 · 선톡 소재.

import type { TopicState } from "./chat-send.contract.ts";
import {
  type Beat,
  beats as allBeats,
  storyEntries,
  type StoryEntry,
} from "./companion-story-data.ts";

export const storyConfig = {
  /** 새로 생긴 카드를 싣는 턴 수(그 턴 포함). */
  showTurns: 3,
  /** 한 번에 싣는 에피소드 수(최근 것부터). */
  maxEntries: 4,
  /** 마지막 턴 뒤 이만큼 지나 다시 오면 새 세션. */
  sessionGapHours: 3,
} as const;

type StoryState = Pick<
  TopicState,
  "turn" | "storySeen" | "storyShow" | "storyShowUntil" | "lastAt"
>;

/** 이번 턴이 새 세션의 첫 턴인가 — 마지막 턴 시각을 모르면(첫 대화 · 옛 상태) 새 세션으로 본다. */
export const sessionStart = (state: Pick<TopicState, "lastAt">, nowMs: number) =>
  state.lastAt == null || nowMs - state.lastAt >= storyConfig.sessionGapHours * 3_600_000;

export type StoryPick = {
  /** 시스템 프롬프트에 넣을 글. 없으면 null. */
  readonly text: string | null;
  /** 이번에 실은 에피소드. */
  readonly shown: readonly string[];
  /** 이번에 처음 실은 에피소드(새 창을 연다). */
  readonly fresh: readonly string[];
};

const noStory: StoryPick = { text: null, shown: [], fresh: [] };

export function storyCardText(entries: readonly StoryEntry[]): string | null {
  if (entries.length === 0) return null;
  const open = entries.flatMap((entry) => entry.open ?? []);
  return [
    "# What happened between you in the story (oldest first)\nThese are things you and the learner did together on their trip. Treat them as past, recent memories (no dates). Bring one up only when it fits — never recite the list.",
    entries.flatMap((entry) => entry.lines.map((line) => `- ${line}`)).join("\n"),
    open.length > 0
      ? `# Still open between you\n${open.map((item) => `- ${item.line}`).join("\n")}`
      : "",
  ]
    .filter((part) => part !== "")
    .join("\n");
}

/** 이번 턴에 실을 카드. `completed`는 학습자가 끝낸 에피소드. 새로 생긴 카드는 새 세션의 첫 턴에만 연다. */
export function pickStory(
  characterId: string,
  completed: readonly string[],
  state: StoryState,
  nowMs: number,
): StoryPick {
  const done = new Set(completed);
  const entries = (storyEntries[characterId] ?? []).filter((entry) => done.has(entry.episode));
  if (entries.length === 0) return noStory;
  const seen = new Set(state.storySeen ?? []);
  // 세션 중간에 끝낸 에피소드는 아직 「안 본 것」으로 남겨 다음 세션에 연다.
  const fresh = sessionStart(state, nowMs)
    ? entries.filter((entry) => !seen.has(entry.episode)).map((entry) => entry.episode)
    : [];
  const window =
    state.storyShowUntil != null && state.turn <= state.storyShowUntil
      ? (state.storyShow ?? [])
      : [];
  const showing = new Set([...window, ...fresh]);
  const shown = entries
    .filter((entry) => showing.has(entry.episode))
    .slice(-storyConfig.maxEntries);
  if (shown.length === 0) return noStory;
  return { text: storyCardText(shown), shown: shown.map((entry) => entry.episode), fresh };
}

/** 카드를 실은 뒤의 상태 칸. 새로 실은 게 있으면 창을 새로 연다. */
export function nextStoryState(
  state: StoryState,
  pick: StoryPick,
): Pick<TopicState, "storySeen" | "storyShow" | "storyShowUntil"> {
  const seen = [...new Set([...(state.storySeen ?? []), ...pick.shown])];
  if (pick.fresh.length === 0)
    return {
      storySeen: seen,
      storyShow: state.storyShow ?? [],
      storyShowUntil: state.storyShowUntil ?? null,
    };
  return {
    storySeen: seen,
    storyShow: pick.shown,
    storyShowUntil: state.turn + storyConfig.showTurns - 1,
  };
}

/** 진도가 맞는 비트(`after`를 끝냈고 `until`은 아직). `used`는 이 대화에서 쓴 비트 id. */
export function eligibleBeats(
  characterId: string,
  completed: readonly string[],
  used: readonly string[] = [],
  pool: readonly Beat[] = allBeats,
): Beat[] {
  const done = new Set(completed);
  const spent = new Set(used);
  return pool.filter(
    (beat) =>
      beat.character === characterId &&
      !spent.has(beat.id) &&
      (beat.after === undefined || done.has(beat.after)) &&
      (beat.until === undefined || !done.has(beat.until)),
  );
}

/** 첫 인사의 카드 — 대화의 처음이라 끝낸 에피소드를 모두(최근 `maxEntries`개). */
export function storyCardFor(characterId: string, completed: readonly string[]): string | null {
  return pickStory(characterId, completed, { turn: 0 }, 0).text;
}

const episodeOrder = (episode: string | undefined) =>
  episode === undefined ? -1 : Number(/^u(\d+)/.exec(episode)?.[1] ?? -1);

/**
 * 선톡 소재 비트 — `opener`인 비트 가운데 가장 최근에 끝낸 에피소드에 걸린 것(진도 반응)을 먼저, 같으면 랜덤. 선톡은 대화 상태를 바꾸지
 * 않아 「쓴 비트」를 세지 않는다 — 되풀이는 최근 선톡 글(`recentOpeners`)이 막는다.
 */
export function openerBeat(
  characterId: string,
  completed: readonly string[],
  random: () => number,
  pool: readonly Beat[] = allBeats,
): Beat | null {
  const candidates = eligibleBeats(characterId, completed, [], pool).filter(
    (beat) => beat.opener === true,
  );
  if (candidates.length === 0) return null;
  const latest = Math.max(...candidates.map((beat) => episodeOrder(beat.after)));
  const top = candidates.filter((beat) => episodeOrder(beat.after) === latest);
  return top[Math.min(top.length - 1, Math.floor(random() * top.length))] ?? null;
}
