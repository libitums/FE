// 캐릭터 답의 학습자 언어(L1) 번역(API §4 `translation`). 매 메시지인지 탭할 때인지(PRD O9)가 미정이라 `COMPANION_TRANSLATION`으로
// 켜고 끕니다. 로마자 표기는 앱이 규칙으로 만들어 서버 일이 아닙니다.
//
// 바로 앞 대화 몇 줄(번역하지 않는 맥락)과 캐릭터 이름 · 페르소나 `glossary`를 같이 넘겨 대명사 · 말투 · 이름 표기를 맞춥니다(20261123).
// 답 조각이 다 모인 뒤 한 번 부르고, 남은 기다림(피드백 · 미성년자 출력 검사)과 동시에 돌려 늘어나는 지연을 줄입니다. 차단 · 위기
// 답은 내보내지도 저장하지도 않습니다(검사에 걸리면 신호로 끊습니다). 실패 · 시간 초과는 턴을 실패시키지 않습니다 — 번역만 없습니다.

import type {
  ChatSendDeps,
  ChatSendEnv,
  CompanionLlm,
  FeedbackHistoryEntry,
  HistoryEntry,
  PersonaCard,
  Segment,
} from "./chat-send.contract.ts";
import type { Sink } from "./chat-send-http.ts";
import { segmentsToPlain } from "./companion-segments.ts";

export const defaultTranslationTimeoutMs = 6_000;

/** `ok` — 조각마다 한 줄(`retried`면 두 번째 시도에서). 그 밖은 저장 meta · 로그에 남기는 이유입니다. */
export type TranslationOutcome =
  | { readonly status: "ok"; readonly lines: readonly string[]; readonly retried?: true }
  | { readonly status: "off" | "skipped_ko" | "timeout" | "failed" | "mismatch" };

/** 번역 맥락으로 넣는 바로 앞 대화 수(20261123 — 대명사 · 말투 맞추기용, 번역하지 않음). */
export const translationContextLimit = 3;
const translationContextLineLimit = 300;

/** 바로 앞 대화를 번역 맥락으로 — 글자만(저장된 번역 · 태그 없음), 빈 줄 빼고, 마지막 `translationContextLimit`개. */
export function translationContext(
  history: readonly (HistoryEntry | FeedbackHistoryEntry)[],
): FeedbackHistoryEntry[] {
  return history
    .map((entry): FeedbackHistoryEntry => ({
      role: entry.role,
      text: ("text" in entry ? entry.text : segmentsToPlain(entry.segments))
        .trim()
        .slice(0, translationContextLineLimit),
    }))
    .filter((entry) => entry.text !== "")
    .slice(-translationContextLimit);
}

/** 번역할 언어. 꺼져 있으면 `off`, 학습자 언어가 한국어면 `skipped_ko`. 언어를 모르면 피드백처럼 영어. */
export function translationTarget(
  env: ChatSendEnv,
  l1: string | null,
): { language: string } | { skip: "off" | "skipped_ko" } {
  if (env.translation === "off") return { skip: "off" };
  const language = l1 ?? "en";
  return language.toLowerCase().startsWith("ko") ? { skip: "skipped_ko" } : { language };
}

export type TranslationInput = {
  readonly segments: readonly Segment[];
  readonly l1: string | null;
  readonly timeoutMs?: number;
  /** 바로 앞 대화(`translationContext`). 없으면 맥락 없이. */
  readonly context?: readonly FeedbackHistoryEntry[];
  /** 이름 표기 — 캐릭터 이름과 페르소나의 `glossary`. */
  readonly persona?: PersonaCard | null;
};

/**
 * 번역을 시작합니다. 거부하지 않는 약속을 돌려줍니다 — 구현이 신호를 따르지 않아도 제한 시간에 끝납니다. 실패 · 개수 틀림이면
 * 제한 시간의 1/3 이상 남았을 때 한 번 다시 시도합니다(남은 시간 안에서). 시간 초과는 다시 시도해도 늦기만 해서 하지 않습니다.
 */
export function startTranslation(
  llm: CompanionLlm,
  env: ChatSendEnv,
  input: TranslationInput,
  abort: AbortSignal,
): Promise<TranslationOutcome> {
  const target = translationTarget(env, input.l1);
  if ("skip" in target) return Promise.resolve({ status: target.skip });
  const timeoutMs = input.timeoutMs ?? defaultTranslationTimeoutMs;
  const deadline = Date.now() + timeoutMs;
  const segments = input.segments.map(({ kind, text }) => ({ kind, text }));
  const persona = input.persona ?? null;
  const attempt = (ms: number): Promise<TranslationOutcome> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return Promise.race([
      llm
        .translate({
          segments,
          l1: target.language,
          ...(input.context === undefined || input.context.length === 0
            ? {}
            : { context: input.context }),
          ...(persona === null
            ? {}
            : {
                glossary: {
                  characterName: persona.name,
                  ...(persona.glossary === undefined ? {} : { terms: persona.glossary }),
                },
              }),
          signal: AbortSignal.any([abort, AbortSignal.timeout(ms)]),
        })
        .then((lines): TranslationOutcome =>
          lines.length === segments.length ? { status: "ok", lines } : { status: "mismatch" },
        )
        .catch((): TranslationOutcome => ({ status: "failed" })),
      new Promise<TranslationOutcome>((resolve) => {
        timer = setTimeout(() => resolve({ status: "timeout" }), ms);
      }),
    ]).finally(() => clearTimeout(timer));
  };
  return attempt(timeoutMs).then(async (first) => {
    if (first.status !== "failed" && first.status !== "mismatch") return first;
    const left = deadline - Date.now();
    if (abort.aborted || left < timeoutMs / 3) return first;
    const second = await attempt(left);
    return second.status === "ok" ? { ...second, retried: true } : first;
  });
}

/** 번역을 조각에 붙입니다(저장용). 빈 줄은 붙이지 않습니다. */
export function withTranslations(
  segments: readonly Segment[],
  outcome: TranslationOutcome,
): Segment[] {
  if (outcome.status !== "ok") return [...segments];
  return segments.map((segment, index) => {
    const translation = outcome.lines[index]?.trim() ?? "";
    return translation === "" ? segment : { ...segment, translation };
  });
}

/** 조각마다 `translation` 이벤트 하나. 조각 delta 뒤 · `state` 앞에 부릅니다. */
export function sendTranslations(sink: Sink, segments: readonly Segment[]): void {
  for (const [segment, entry] of segments.entries()) {
    if (entry.translation !== undefined)
      sink.send({ event: "translation", data: { segment, text: entry.translation } });
  }
}

/** 번역을 조각에 붙여 `translation` 이벤트로 보내고, 번역이 없으면 로그에 남깁니다. 저장할 조각을 돌려줍니다. */
export function applyTranslation(
  sink: Sink,
  log: ChatSendDeps["log"],
  segments: readonly Segment[],
  outcome: TranslationOutcome,
): Segment[] {
  const translated = withTranslations(segments, outcome);
  sendTranslations(sink, translated);
  if (!["ok", "off", "skipped_ko"].includes(outcome.status))
    log({
      event: "chat_send",
      status: "stream",
      outcome: "translation_unavailable",
      error: outcome.status,
    });
  return translated;
}
