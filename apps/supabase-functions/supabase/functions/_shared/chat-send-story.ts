// 친구 스토리 답장(ADR-0178 D5 · D6). 요청에 `story_id`가 있으면 관문 **전에** 첫 답장 무료를 판정합니다 — 무료면 서버가 그 메시지에 금액 0
// 예약을 먼저 두고, 관문 · 시작(`begin_turn`)이 그 예약을 그대로 씁니다. 판정은 인용도 남깁니다(기록 읽기의 `story`). 이번 턴 지시에 그 스토리
// 한 줄을 실어 캐릭터가 무엇에 답하는지 압니다. 판정이 실패하면 보통 턴입니다 — 던지지 않습니다.
// 내 스토리(ADR-0179)의 id면 판정은 `mine` — 무료가 아니고 인용만 남깁니다. 지시에는 단어와 그 인물이 단 반응을 싣습니다.
// 스토리 맥락(ADR-0191 D9): 답장이 아닌 보통 턴에도, 학습자의 살아 있는 내 스토리와 그 인물이 최근 올린 자기 스토리를 이번 턴 지시에 싣습니다
// (`companion_story_context`). 「Seen by」로 봤다고 표시된 인물이 모른다고 답하지 않게 하는 장치입니다. 읽지 못하면 싣지 않습니다.

import { STORY_TEXT_IS_DATA, storyText } from "./companion-reaction-prompt.ts";
import { callRpc, type RpcEnv } from "./companion-rpc.ts";
import type { Outbound } from "./delete-account.contract.ts";

export type StoryClaimResult =
  | "none"
  | "free"
  | "used"
  | "expired"
  | "mine"
  | "not_found"
  | "off"
  | "claim_failed";

/**
 * 이 턴이 답하는 스토리 — `line`은 인용이 남은 결과(free · used · expired · mine)에만 있습니다. 내 스토리면 `line`은 단어(한국어)이고
 * `reaction`은 그 인물이 단 반응(없으면 null). `note`는 스토리 맥락(ADR-0191 D9) — 답장이 아닌 턴은 `result: "none"`에 `note`만 있습니다.
 */
export type TurnStory = {
  readonly result: StoryClaimResult;
  readonly line: string | null;
  readonly reaction?: string | null;
  readonly note?: string | null;
};

const RESULTS: readonly StoryClaimResult[] = [
  "free",
  "used",
  "expired",
  "mine",
  "not_found",
  "off",
];
const QUOTED: ReadonlySet<StoryClaimResult> = new Set(["free", "used", "expired", "mine"]);
const oneLine = (text: string) => text.replace(/\s+/gu, " ").trim();

export async function claimStory(
  outbound: Outbound,
  env: RpcEnv,
  input: {
    readonly userId: string;
    readonly storyId: string;
    readonly characterId: string;
    readonly clientMessageId: string;
    readonly now: string;
  },
): Promise<TurnStory> {
  try {
    const claimed = await callRpc<{
      result?: unknown;
      story?: { line?: unknown; reaction?: unknown } | null;
    } | null>(outbound, env, "companion_claim_story_reply", {
      p_user_id: input.userId,
      p_story_id: input.storyId,
      p_character_id: input.characterId,
      p_client_message_id: input.clientMessageId,
      p_now: input.now,
    });
    const result = RESULTS.find((candidate) => candidate === claimed?.result) ?? "claim_failed";
    const line = claimed?.story?.line;
    const reaction = claimed?.story?.reaction;
    return {
      result,
      line: QUOTED.has(result) && typeof line === "string" && line.trim() !== "" ? line : null,
      reaction:
        result === "mine" && typeof reaction === "string" && reaction.trim() !== ""
          ? reaction
          : null,
    };
  } catch {
    return { result: "claim_failed", line: null, reaction: null };
  }
}

type StoryContext = {
  mine?:
    | { kind?: unknown; ko?: unknown; meaning?: unknown; exampleKo?: unknown; scene?: unknown }[]
    | null;
  own?: { line?: unknown }[] | null;
} | null;

const filled = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

/**
 * 스토리 맥락 → 지시 한 덩이. 실을 것이 없으면 null. 순수.
 * 내 스토리의 글은 학습자가 보낸 것이라(서버가 카탈로그와 대조하지 않는다) 다듬어(`storyText`) 인용부호 안에만 싣고 자료라고 적는다.
 * 단어 · 카드의 예문은 싣지 않는다 — 대화 턴에는 단어와 뜻이면 충분하고, 긴 자유 글을 시스템 지시에 넣지 않는다.
 */
export function storyContextText(context: StoryContext): string | null {
  const mine = (context?.mine ?? []).flatMap((story) => {
    if (!filled(story.ko)) return [];
    const meaning = filled(story.meaning) ? ` (${storyText(story.meaning, 60)})` : "";
    // 사진 스토리(ADR-0191 D11) — 사진이 아니라 읽기 단계의 장면 설명만 싣는다.
    if (story.kind === "photo")
      return [
        `a photo with the caption "${storyText(story.ko)}"${meaning}` +
          (filled(story.scene) ? ` — the photo shows: ${oneLine(story.scene)}` : ""),
      ];
    const what = story.kind === "card" ? "a lesson card" : "a word card";
    return [`${what} "${storyText(story.ko, 40)}"${meaning}`];
  });
  const own = (context?.own ?? []).flatMap((story) =>
    filled(story.line) ? [`"${oneLine(story.line)}"`] : [],
  );
  const notes = [
    mine.length === 0
      ? null
      : `The learner has a story up right now, and you have seen it: ${mine.join("; ")}.` +
        " You know about it if it comes up; mention it only when it fits." +
        STORY_TEXT_IS_DATA,
    own.length === 0
      ? null
      : `Stories you posted recently (newest first): ${own.join(", ")}. You remember posting them.`,
  ].filter((note): note is string => note !== null);
  return notes.length === 0 ? null : notes.join("\n");
}

/** 이번 턴의 스토리 맥락을 읽습니다. 꺼져 있거나 옛 서버(함수 없음)거나 읽지 못하면 null — 던지지 않습니다. */
export async function storyContextNote(
  outbound: Outbound,
  env: RpcEnv,
  input: { readonly userId: string; readonly characterId: string; readonly now: string },
): Promise<string | null> {
  try {
    const context = await callRpc<StoryContext>(outbound, env, "companion_story_context", {
      p_user_id: input.userId,
      p_character_id: input.characterId,
      p_now: input.now,
    });
    return storyContextText(context);
  } catch {
    return null;
  }
}

/** 판정 결과에 스토리 맥락을 얹습니다. 둘 다 없으면 null. */
export function withStoryNote(story: TurnStory | null, note: string | null): TurnStory | null {
  if (note === null) return story;
  return story === null ? { result: "none", line: null, note } : { ...story, note };
}

/** 스토리 지시 — 답장 안내 · 스토리 맥락 · 서버가 고른 이번 턴 지시(화제 전환 · 학습 표현) 순으로 잇습니다. 스토리가 없으면 그 지시 그대로. */
export function withStoryDirective(
  story: TurnStory | null,
  directive: string | null,
): string | null {
  const parts: string[] = [];
  if (story?.line != null) {
    const line = story.result === "mine" ? storyText(story.line, 40) : oneLine(story.line);
    parts.push(
      story.result === "mine"
        ? `The learner posted a word story about "${line}" and is now replying to what you said about it.` +
            (story.reaction == null ? "" : ` Your comment was: "${oneLine(story.reaction)}".`) +
            ` Keep chatting naturally, in character, and use "${line}" again if it fits.`
        : `The learner is replying to the story you posted today: "${line}". ` +
            "React to it naturally, in character, as a friend who just got a reply to their story.",
    );
  }
  if (story?.note != null && story.note !== "") parts.push(story.note);
  if (directive !== null) parts.push(directive);
  return parts.length === 0 ? null : parts.join("\n");
}
