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
import { companionSystemPrompt } from "./companion-prompt.ts";
import { storyCardFor } from "./companion-story.ts";
import { collectSegments, createSegmentSplitter, type SegmentDelta } from "./companion-segments.ts";

export type ReplyEvalCase = {
  readonly text: string;
  readonly ageBand?: "adult" | "minor" | "unknown";
  /** 적용 로맨스 수위(ADR-0164). 생략하면 standard. */
  readonly romanceTier?: "open" | "standard";
  readonly l1?: string | null;
  readonly speechLevel?: SpeechLevel | null;
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
  const speechLevel = item.speechLevel ?? "polite";
  const ageBand = item.ageBand ?? "adult";
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
  const story =
    item.characterId === undefined || item.episodes === undefined
      ? null
      : storyCardFor(item.characterId, item.episodes);
  const prompt = companionSystemPrompt({
    persona,
    speechLevel,
    ageBand,
    romanceTier: item.romanceTier ?? "standard",
    l1: item.l1 ?? null,
    expressions,
    summary: item.summary ?? null,
    feedbackMode: "separate",
    memories: item.memories ?? [],
    directive: null,
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
    userText: item.text,
    directive: offer === null ? null : offerDirective(offer),
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
        userText: item.text,
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
