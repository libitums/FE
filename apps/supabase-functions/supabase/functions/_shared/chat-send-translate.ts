// 캐릭터 답의 학습자 언어(L1) 번역(API §4 `translation`). 매 메시지인지 탭할 때인지(PRD O9)가 미정이라 `COMPANION_TRANSLATION`으로
// 켜고 끕니다. 로마자 표기는 앱이 규칙으로 만들어 서버 일이 아닙니다.
//
// 답 조각이 다 모인 뒤 한 번 부르고, 남은 기다림(피드백 · 미성년자 출력 검사)과 동시에 돌려 늘어나는 지연을 줄입니다. 차단 · 위기
// 답은 내보내지도 저장하지도 않습니다(검사에 걸리면 신호로 끊습니다). 실패 · 시간 초과는 턴을 실패시키지 않습니다 — 번역만 없습니다.

import type { ChatSendEnv, CompanionLlm, Segment } from "./chat-send.contract.ts";
import type { Sink } from "./chat-send-http.ts";

export const defaultTranslationTimeoutMs = 6_000;

/** `ok` — 조각마다 한 줄. 그 밖은 저장 meta · 로그에 남기는 이유입니다. */
export type TranslationOutcome =
  | { readonly status: "ok"; readonly lines: readonly string[] }
  | { readonly status: "off" | "skipped_ko" | "timeout" | "failed" | "mismatch" };

/** 번역할 언어. 꺼져 있으면 `off`, 학습자 언어가 한국어면 `skipped_ko`. 언어를 모르면 피드백처럼 영어. */
export function translationTarget(
  env: ChatSendEnv,
  l1: string | null,
): { language: string } | { skip: "off" | "skipped_ko" } {
  if (env.translation === "off") return { skip: "off" };
  const language = l1 ?? "en";
  return language.toLowerCase().startsWith("ko") ? { skip: "skipped_ko" } : { language };
}

/** 번역을 시작합니다. 거부하지 않는 약속을 돌려줍니다 — 구현이 신호를 따르지 않아도 제한 시간에 끝납니다. */
export function startTranslation(
  llm: CompanionLlm,
  env: ChatSendEnv,
  input: { segments: readonly Segment[]; l1: string | null; timeoutMs?: number },
  abort: AbortSignal,
): Promise<TranslationOutcome> {
  const target = translationTarget(env, input.l1);
  if ("skip" in target) return Promise.resolve({ status: target.skip });
  const timeoutMs = input.timeoutMs ?? defaultTranslationTimeoutMs;
  const segments = input.segments.map(({ kind, text }) => ({ kind, text }));
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    llm
      .translate({
        segments,
        l1: target.language,
        signal: AbortSignal.any([abort, AbortSignal.timeout(timeoutMs)]),
      })
      .then((lines): TranslationOutcome =>
        lines.length === segments.length ? { status: "ok", lines } : { status: "mismatch" },
      )
      .catch((): TranslationOutcome => ({ status: "failed" })),
    new Promise<TranslationOutcome>((resolve) => {
      timer = setTimeout(() => resolve({ status: "timeout" }), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
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
