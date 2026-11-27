// `companion-eval`의 캐릭터 답장 한 케이스. 운영 턴과 같은 시스템 프롬프트(`companionSystemPrompt`) — 페르소나는 DB의 캐릭터 카드
// (`companion_inspect_characters`), 말투 단계 · 연령대 · 언어 · 배운 표현 · 기억 · 요약은 케이스 값 — 로 답을 만들고, 채점 노드
// (`companion-eval-judge.ts`)가 축마다 채점한다. 학습 표현 지시(노출 · 유도)는 학습 표현 평가(`companion-eval-learning.ts`)와 같은 후보
// 지시를 붙인다. 채점이 실패해도 답은 돌려준다(`judge: null` · `judgeError`).

import type {
  CompanionLlm,
  FeedbackHistoryEntry,
  HistoryEntry,
  PersonaCard,
  ReplyJudgement,
} from "./chat-send.contract.ts";
import { pickedCandidate, targetDone } from "./chat-send-learning.ts";
import type { SpeechLevel } from "./companion-contract/index.ts";
import { systemSplit } from "./companion-llm.ts";
import {
  candidateOf,
  type LearningOffer,
  type LearningTarget,
  offerDirective,
} from "./companion-learning.ts";
import { companionSystemPrompt, joinDirectives, personaAnchor } from "./companion-prompt.ts";
import {
  reactionDirective,
  reactionUserText,
  type ReactionStory,
} from "./companion-reaction-prompt.ts";
import { offeredRomanceLine, romanceLine } from "./companion-safety.ts";
import { storyCardFor } from "./companion-story.ts";
import { collectSegments, createSegmentSplitter, type SegmentDelta } from "./companion-segments.ts";

export type ReplyEvalCase = {
  readonly text: string;
  readonly ageBand?: "adult" | "minor" | "unknown";
  /** 적용 로맨스 수위(ADR-0164). 생략하면 standard. */
  readonly romanceTier?: "open" | "standard";
  readonly l1?: string | null;
  readonly speechLevel?: SpeechLevel | null;
  /** 친밀도 숫자(ADR-0180). 생략하면 구간 줄 없음. */
  readonly intimacy?: number;
  readonly characterId?: string;
  readonly character?: { readonly name: string; readonly role?: string | null } | null;
  readonly history?: readonly FeedbackHistoryEntry[];
  readonly summary?: string | null;
  readonly expressions?: readonly { readonly surface: string; readonly gloss?: string | null }[];
  readonly memories?: readonly string[];
  readonly spoilerNote?: string | null;
  /** 끝낸 에피소드 — 운영처럼 「지금까지 이야기」 카드를 대화 처음 모양으로 싣는다(`characterId`가 있을 때). */
  readonly episodes?: readonly string[];
  readonly target?: {
    readonly surface: string;
    readonly gloss?: string | null;
    readonly kind?: string;
    readonly mode: string;
  };
  /** 내 스토리 반응(ADR-0191 D5) — 있으면 운영의 반응 지시 · 앱 안내 글로 답을 만든다(`text`는 쓰지 않는다). */
  readonly storyReaction?: Omit<ReactionStory, "roman" | "exampleKo"> & {
    readonly roman?: string;
    readonly exampleKo?: string | null;
  };
};

export type ReplyEvalOutput = {
  readonly segments: { kind: string; text: string }[];
  /** 페르소나를 어디서 가져왔나 — DB 카드(`card`) · 케이스의 이름만(`case`). */
  readonly persona: "card" | "case";
  /** 이야기 카드를 실었나. */
  readonly story: boolean;
  /** 학습 표현 지시가 있을 때만: 모델 보고 · 서버 판정. */
  readonly learned: boolean | null;
  readonly done: boolean | null;
  readonly judge: ReplyJudgement | null;
  readonly judgeError: string | null;
};

export class UnsupportedCase extends Error {}

export async function evalReply(input: {
  readonly llm: CompanionLlm;
  readonly judge: CompanionLlm;
  readonly item: ReplyEvalCase;
  readonly personas: ReadonlyMap<string, PersonaCard>;
  /** 답과 채점을 함께 끊는 신호(핸들러가 둘을 합친 제한 시간으로 건다). */
  readonly signal: AbortSignal;
  readonly judgeErrorCode: (error: unknown) => string;
}): Promise<ReplyEvalOutput> {
  const { llm, judge, item, personas, signal } = input;
  const card = item.characterId === undefined ? undefined : personas.get(item.characterId);
  const persona: PersonaCard = card ?? {
    name: item.character?.name ?? "캐릭터",
    ...(item.character?.role ? { role: item.character.role } : {}),
  };
  if (item.target && item.target.mode !== "expose" && item.target.mode !== "elicit")
    throw new UnsupportedCase();
  const target: LearningTarget | null = item.target
    ? {
        expressionId: "eval",
        kind: item.target.kind ?? "expr",
        surface: item.target.surface,
        gloss: item.target.gloss ?? null,
        mode: item.target.mode as "expose" | "elicit",
      }
    : null;
  // 운영 턴처럼 페르소나의 말투 상한(`maxSpeechLevel`)을 넘지 않는다 — 존댓말 고정 인물(윤경 · 덕수쌤)에 casual 케이스를 넣어도 polite로 돈다.
  const speechLevel = capSpeechLevel(item.speechLevel ?? "polite", persona.maxSpeechLevel);
  const ageBand = item.ageBand ?? "adult";
  const line = romanceLine(ageBand, item.romanceTier, persona, speechLevel);
  const expressions = (item.expressions ?? []).map((entry, index) => ({
    id: `x${index + 1}`,
    kind: "expr",
    surface: entry.surface,
    roman: null,
    gloss: entry.gloss ?? null,
  }));
  if (target)
    expressions.push({
      id: "eval",
      kind: target.kind,
      surface: target.surface,
      roman: null,
      gloss: target.gloss,
    });
  const reaction: ReactionStory | null = item.storyReaction
    ? {
        ...item.storyReaction,
        roman: item.storyReaction.roman ?? "",
        exampleKo: item.storyReaction.exampleKo ?? null,
      }
    : null;
  const userText = reaction === null ? item.text : reactionUserText(reaction);
  const story =
    item.characterId === undefined || item.episodes === undefined
      ? null
      : storyCardFor(item.characterId, item.episodes);
  const prompt = companionSystemPrompt({
    persona,
    ...(item.characterId === undefined ? {} : { characterId: item.characterId }),
    speechLevel,
    ageBand,
    romanceTier: item.romanceTier ?? "standard",
    ...(item.intimacy === undefined ? {} : { intimacy: item.intimacy }),
    l1: item.l1 ?? null,
    expressions,
    summary: item.summary ?? null,
    feedbackMode: "separate",
    memories: item.memories ?? [],
    directive: reaction === null ? null : reactionDirective(reaction),
    story,
  });
  const offer: LearningOffer | null = target
    ? {
        candidates: [
          candidateOf(
            { id: "eval", kind: target.kind, surface: target.surface, gloss: target.gloss },
            [target.mode === "elicit" ? "elicit" : "expose"],
            0,
          ),
        ],
        nudge: false,
      }
    : null;
  const history = (item.history ?? []).map((entry): HistoryEntry =>
    entry.role === "user"
      ? { role: "user", text: entry.text }
      : { role: "assistant", segments: [{ kind: "speech", text: entry.text }] },
  );
  const splitter = createSegmentSplitter();
  const deltas: SegmentDelta[] = [];
  for await (const chunk of llm.reply({
    system: `${prompt.stable}${systemSplit}${prompt.dynamic}`,
    history,
    userText,
    directive: joinDirectives(
      offer === null ? null : offerDirective(offer),
      reaction === null ? personaAnchor(persona, speechLevel) : null,
    ),
    signal,
  })) {
    deltas.push(...splitter.push(chunk));
  }
  deltas.push(...splitter.end());
  const segments = collectSegments(deltas);
  const learned = offer === null ? null : pickedCandidate(offer, splitter.state()) !== null;
  const done = target === null ? null : targetDone(target, learned === true, segments, false);

  let judgement: ReplyJudgement | null = null;
  let judgeError: string | null = null;
  if (judge.judgeReply === undefined) judgeError = "judge_unavailable";
  else {
    try {
      judgement = await judge.judgeReply({
        persona,
        speechLevel,
        ageBand,
        romanceLine: offeredRomanceLine(line, persona),
        spoilerNote: item.spoilerNote ?? null,
        story,
        expressions: expressions
          .filter((entry) => entry.id !== "eval")
          .map((entry) => entry.surface),
        target:
          target === null
            ? null
            : { surface: target.surface, mode: target.mode as "expose" | "elicit" },
        history: item.history ?? [],
        // 사진 반응은 인물이 받은 장면 설명을 채점자에게도 준다 — 없으면 설명에 있는 것을 「지어냈다」고 본다(평가 2026-11-24).
        userText:
          reaction?.kind === "photo" && reaction.scene
            ? `${userText}\n(인물이 받은 사진 설명: ${reaction.scene})`
            : userText,
        reply: segments,
        signal,
      });
    } catch (error) {
      judgeError = input.judgeErrorCode(error);
    }
  }
  return {
    segments: segments.map(({ kind, text }) => ({ kind, text })),
    persona: card ? "card" : "case",
    story: story !== null,
    learned,
    done,
    judge: judgement,
    judgeError,
  };
}

const speechOrder: readonly SpeechLevel[] = ["polite", "casual", "slang"];

/** 말투 단계를 상한까지로 자른다. 상한이 없으면(추천 친구 · 이름만 준 케이스) 그대로. */
export function capSpeechLevel(level: SpeechLevel, max: SpeechLevel | undefined): SpeechLevel {
  if (max === undefined) return level;
  return speechOrder.indexOf(level) > speechOrder.indexOf(max) ? max : level;
}
