// 사진 스토리의 글 — 올리기 전 교정과 글 검수(ADR-0191 D11). 런타임 중립.
// 교정은 대화의 피드백 노드를 그대로 쓴다(대화 맥락 없이 글 하나만): 한국어면 고칠 곳 · 더 자연스러운 말, 모국어면 한국어로.
// 글 검수는 대화의 입력 검사와 같은 층(`input`) — 막힌 글은 올리지 못하고, 위기 신호는 호출한 쪽이 따로 다룬다.

import type { AgeBand, ChatSendEnv, CompanionLlm } from "./chat-send.contract.ts";
import { startTranslation } from "./chat-send-translate.ts";
import type { MyStoryDraft } from "./companion-contract/index.ts";

export const STORY_LINE_MAX = 120;
export const STORY_DRAFT_TEXT_MAX = 300;

export type StoryTextVerdict = "allow" | "block" | "crisis";

/** 글 검수. 모델이 실패하면 던진다 — 호출한 쪽이 올리기를 받지 않는다(검수 없이 통과시키지 않는다). */
export async function checkStoryText(
  llm: CompanionLlm,
  text: string,
  ageBand: AgeBand,
  signal: AbortSignal,
): Promise<StoryTextVerdict> {
  const verdict = await llm.moderate({ layer: "input", text, context: null, ageBand, signal });
  return verdict.action;
}

const clipLine = (text: string) => {
  const flat = text.replace(/\s+/gu, " ").trim();
  return [...flat].length <= STORY_LINE_MAX ? flat : [...flat].slice(0, STORY_LINE_MAX).join("");
};

/** 교정 — 자연스러운 한국어 한 줄 · 뜻 · 한 줄 팁. 피드백을 못 받으면 null(호출한 쪽이 `unavailable`). */
export async function draftStoryLine(
  llm: CompanionLlm,
  env: ChatSendEnv,
  input: { readonly text: string; readonly l1: string | null; readonly timeoutMs?: number },
  signal: AbortSignal,
): Promise<MyStoryDraft | null> {
  const text = input.text.replace(/\s+/gu, " ").trim();
  const feedback = await llm.feedback({
    text,
    l1: input.l1,
    previous: null,
    history: [],
    speechLevel: null,
    character: null,
    signal,
  });
  if (feedback.status !== "ok" && feedback.status !== "none") return null;
  let draft: MyStoryDraft;
  if (feedback.kind === "better" && feedback.better !== null) {
    draft = {
      kind: "better",
      ko: clipLine(feedback.better.text),
      meaning: feedback.better.meaning.trim() || null,
      tip: feedback.better.explanation.trim() || null,
    };
  } else if (
    (feedback.kind === "correction" || feedback.kind === "l1_to_ko") &&
    feedback.corrected !== null &&
    feedback.corrected.trim() !== ""
  ) {
    draft = {
      kind: feedback.kind,
      ko: clipLine(feedback.corrected),
      meaning: feedback.meaning?.trim() || (feedback.kind === "l1_to_ko" ? text : null),
      tip: feedback.items[0]?.reason.trim() || null,
    };
  } else {
    draft = {
      kind: "same",
      ko: clipLine(text),
      meaning: feedback.meaning?.trim() || null,
      tip: null,
    };
  }
  if (draft.ko === "") return null;
  if (draft.meaning !== null) return draft;
  // 뜻이 없으면(그대로 좋은 한국어 글 등) 번역 노드로 채운다. 실패해도 교정은 돌려준다.
  const translated = await startTranslation(
    llm,
    env,
    { segments: [{ kind: "speech", text: draft.ko }], l1: input.l1, timeoutMs: input.timeoutMs },
    signal,
  );
  return {
    ...draft,
    meaning: translated.status === "ok" ? translated.lines.join(" ").trim() || null : null,
  };
}
