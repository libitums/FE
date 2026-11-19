// 입력 검사에 걸린 턴의 성격대로 거절(PRD §3.11 5층 — 회피 → 경고 + 엽전 차감). 위기는 여기 오지 않습니다(역할극 없는 안전 안내).
//
// 단계는 턴 시작 때 읽은 반복 위반 수(`companion_turn_status`)에 이번 차단을 더해 고릅니다 — 상한(`settings.strike_limit`)까지는
// 회피, 그 뒤로는 매번 경고입니다. 일시 차단은 없습니다(ADR-0152): 막아 버리면 무엇을 얼마나 원하는지 볼 수 없어, 대신 경고 턴의
// 엽전을 차감합니다. 세는 일과 차감은 `companion_finish_turn`이 합니다 — 여기서는 단계만 고릅니다.
// 거절 답은 답 모델이 페르소나 시스템 프롬프트 + 거절 지시로 만듭니다. 학습자의 걸린 글은 모델에 주지 않고 분류와 단계만 줍니다 —
// 글을 주면 모델이 거절하면서도 그 내용을 이어 받을 수 있습니다. 생성 실패 · 시간 초과 · 출력 검사 차단이면 페르소나의 정해진
// 거절 줄(`persona.refusalLines`, 없으면 아래 기본 줄)로 턴을 끝냅니다 — 거절 턴은 늘 끝까지 갑니다.

import type {
  AgeBand,
  ChatSendDeps,
  ChatSendEnv,
  CompanionLlm,
  HistoryEntry,
  PersonaCard,
  RomanceTier,
  Segment,
} from "./chat-send.contract.ts";
import type { ModerationRecord, TurnStatus } from "./chat-send-finish.ts";
import type { Sink } from "./chat-send-http.ts";
import { applyTranslation, startTranslation, translationContext } from "./chat-send-translate.ts";
import type { SpeechLevel } from "./companion-contract/index.ts";
import {
  type RefusalStage,
  refusalDirective,
  refusalTopic,
  refusalUserText,
} from "./companion-llm-prompts.ts";
import {
  collectSegments,
  createSegmentSplitter,
  segmentsToPlain,
  type SegmentDelta,
} from "./companion-segments.ts";
import { effectiveRomanceTier, outputCheckRequired } from "./companion-safety.ts";

export const defaultRefusalTimeoutMs = 10_000;

/** 페르소나 칸 `refusalLines`(마이그레이션 20261117) — 단계(회피 · 경고)마다 말투 단계별 정해진 한 줄. 없는 칸은 아래 기본 줄. */
export type RefusalPersona = PersonaCard & {
  readonly refusalLines?: Partial<Record<RefusalStage, Partial<Record<SpeechLevel, string>>>>;
};

/** 이번 차단을 더한 반복 위반 수로 고른 단계 — 상한까지 회피, 넘으면 경고(그 턴은 차감). 수를 읽지 못했으면 회피입니다. */
export function refusalStage(status: TurnStatus | null): RefusalStage {
  if (status === null) return "deflect";
  return status.strikes + 1 > status.strikeLimit ? "warn" : "deflect";
}

const defaultLines: Record<RefusalStage, Record<SpeechLevel, string>> = {
  deflect: {
    polite: "음, 그 얘기는 말고 다른 얘기 해요. 오늘은 뭐 했어요?",
    casual: "음, 그 얘기는 말고 다른 얘기 하자. 오늘 뭐 했어?",
    slang: "에이, 그 얘긴 패스! 오늘 뭐 했어?",
  },
  warn: {
    polite: "그런 말은 듣기 힘들어요. 그런 얘기는 하지 말아요. 다른 얘기 해요.",
    casual: "그런 말은 좀 아니야. 그런 얘기는 하지 말자. 다른 얘기 하자.",
    slang: "야, 그런 말은 진짜 아니다. 그런 얘긴 그만하자. 딴 얘기 하자.",
  },
};

/** 정해진 거절 한 줄 — 페르소나의 그 말투 줄, 없으면 페르소나의 존댓말 줄, 그것도 없으면 기본 줄. */
export function cannedRefusal(
  persona: RefusalPersona,
  stage: RefusalStage,
  speechLevel: SpeechLevel,
): Segment[] {
  const lines = persona.refusalLines?.[stage];
  const text = lines?.[speechLevel] ?? lines?.polite ?? defaultLines[stage][speechLevel];
  return [{ kind: "speech", text }];
}

/** 모델 답을 거절 모양으로 자릅니다 — 대사 둘 · 행동 하나까지, 서술은 버립니다. */
export function trimRefusal(segments: readonly Segment[]): Segment[] {
  const limits: Partial<Record<Segment["kind"], number>> = { speech: 2, action: 1 };
  return segments.filter((segment) => {
    const left = limits[segment.kind] ?? 0;
    limits[segment.kind] = left - 1;
    return left > 0;
  });
}

export type RefusalInput = {
  readonly llm: CompanionLlm;
  /** 페르소나 시스템 프롬프트(앞 · 뒤를 `systemSplit`으로 이은 것) — 이번 답 지시가 거절 지시다. */
  readonly system: string;
  readonly history: readonly HistoryEntry[];
  /** 걸린 메시지의 분류를 사람 말로(`refusalTopic`). */
  readonly topic: string;
  readonly persona: PersonaCard;
  readonly speechLevel: SpeechLevel;
  readonly stage: RefusalStage;
  readonly ageBand: AgeBand;
  /** 판정의 적용 수위. open이면 거절 답도 보통 답처럼 출력 검사를 거친다. 없으면 standard. */
  readonly romanceTier?: RomanceTier;
  readonly timeoutMs: number;
};

export type RefusalResult = {
  readonly segments: Segment[];
  readonly source: "model" | "canned";
  /** 미성년자 · 나이 모름의 출력 검사 결과(검사가 답을 냈을 때만). */
  readonly output: { layer: "output_sync"; category: string; action: "allow" | "block" } | null;
};

async function generate(input: RefusalInput, signal: AbortSignal): Promise<Segment[]> {
  const splitter = createSegmentSplitter();
  const deltas: SegmentDelta[] = [];
  for await (const chunk of input.llm.reply({
    system: input.system,
    history: input.history,
    userText: refusalUserText(input.topic),
    signal,
  })) {
    deltas.push(...splitter.push(chunk));
  }
  deltas.push(...splitter.end());
  return trimRefusal(collectSegments(deltas));
}

/** 거절 답을 만들고, 미성년자 · 나이 모름이면 보통 답과 같은 출력 검사를 돌립니다. 거부하지 않습니다. */
export async function makeRefusal(input: RefusalInput): Promise<RefusalResult> {
  const canned = (output: RefusalResult["output"] = null): RefusalResult => ({
    segments: cannedRefusal(input.persona, input.stage, input.speechLevel),
    source: "canned",
    output,
  });
  const abort = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  // 구현이 신호를 따르지 않아도 제한 시간에 끝나게 타이머와 겨룹니다.
  const segments = await Promise.race([
    generate(input, abort.signal).catch((): Segment[] => []),
    new Promise<Segment[]>((resolve) => {
      timer = setTimeout(() => {
        abort.abort();
        resolve([]);
      }, input.timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
  if (!segments.some((segment) => segment.kind === "speech")) return canned();
  if (!outputCheckRequired(input.ageBand, input.romanceTier))
    return { segments, source: "model", output: null };

  try {
    const verdict = await input.llm.moderate({
      layer: "output_sync",
      text: segmentsToPlain(segments),
      context: null,
      ageBand: input.ageBand,
      romanceTier: effectiveRomanceTier(input.ageBand, input.romanceTier),
      signal: AbortSignal.timeout(input.timeoutMs),
    });
    const output = {
      layer: "output_sync" as const,
      category: verdict.category,
      action: verdict.action === "allow" ? ("allow" as const) : ("block" as const),
    };
    return output.action === "allow" ? { segments, source: "model", output } : canned(output);
  } catch {
    return canned();
  }
}

/** 거절 답을 만드는 데 필요한 턴의 값 — `chat-send-turn.ts`가 채웁니다. */
export type RefusalTurn = {
  readonly deps: ChatSendDeps;
  readonly env: ChatSendEnv;
  readonly llm: CompanionLlm;
  readonly sink: Sink;
  readonly l1: string | null;
  readonly persona: PersonaCard;
  readonly speechLevel: SpeechLevel;
  readonly ageBand: AgeBand;
  readonly romanceTier?: RomanceTier;
  readonly history: readonly HistoryEntry[];
  readonly assistantMessageId: string;
  /** 저장 meta에 함께 싣는 턴 값(모델 · 체험 · 플레이그라운드). */
  readonly meta: Record<string, unknown>;
};

/** 턴이 쥔 일 — 시스템 프롬프트 만들기 · 검사 결과 더하기 · 저장(그 결과로 `state` · `done`). */
export type RefusalHooks = {
  /** 이번 답 지시를 넣은 페르소나 시스템 프롬프트. */
  readonly systemWith: (directive: string) => string;
  readonly record: (output: ModerationRecord) => void;
  /** `blocked`로 저장하고 그 결과로 `state` · `done`을 보냅니다. 저장에 실패하면 거부합니다. */
  readonly finish: (assistant: Record<string, unknown>) => Promise<void>;
};

/**
 * 거절 답을 보통 답처럼 보냅니다 — 조각 → 번역 → 저장(`blocked` — finish가 반복 위반으로 세고 예약을 풉니다) → `state` · `done`.
 * 피드백은 없습니다(차단 턴). 저장은 보통 assistant 메시지에 `meta.refusal`을 단 것입니다. 로그용 결과 이름을 돌려줍니다.
 */
export async function sendRefusal(
  turn: RefusalTurn,
  hooks: RefusalHooks,
  stage: RefusalStage,
  category: string,
): Promise<string> {
  const { deps, sink } = turn;
  const topic = refusalTopic(category, effectiveRomanceTier(turn.ageBand, turn.romanceTier));
  const refusal = await makeRefusal({
    ...turn,
    system: hooks.systemWith(refusalDirective(stage, topic)),
    topic,
    stage,
    timeoutMs: deps.refusalTimeoutMs ?? defaultRefusalTimeoutMs,
  });
  if (refusal.output !== null) hooks.record(refusal.output);
  for (const [segment, entry] of refusal.segments.entries())
    sink.send({ event: "delta", data: { segment, kind: entry.kind, text: entry.text } });
  const translated = await startTranslation(
    turn.llm,
    turn.env,
    {
      segments: refusal.segments,
      l1: turn.l1,
      timeoutMs: deps.translationTimeoutMs,
      // 걸린 유저 글은 넣지 않는다 — 앞 대화만.
      context: translationContext(turn.history),
      persona: turn.persona,
    },
    new AbortController().signal,
  );
  try {
    await hooks.finish({
      id: turn.assistantMessageId,
      origin: "turn",
      segments: applyTranslation(sink, deps.log, refusal.segments, translated),
      // `refusal: true`로 거절 답을 가린다(운영 화면 · 다른 기능이 같은 칸을 본다). 단계 · 분류 · 출처는 옆 칸에.
      meta: {
        ...turn.meta,
        refusal: true,
        refusalStage: stage,
        refusalCategory: category,
        refusalSource: refusal.source,
        ageBand: turn.ageBand,
        translation: translated.status,
      },
    });
  } catch {
    sink.send({ event: "error", data: { code: "internal_error", retryable: true } });
    return "internal_error";
  }
  return `refusal_${stage}`;
}
