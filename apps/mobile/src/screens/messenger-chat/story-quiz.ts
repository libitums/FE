// 덕수쌤 스토리 퀴즈(시안 21 ~ 23) — 서버 반영 예상. 대화 로그의 퀴즈 표시(`ChatQuizMark`)만 보고 판정합니다. 순수.
// 엽전 차감 · 정답 판정은 서버 몫이고, 여기서는 「다음 답이 무료인가」만 가립니다(음성 선물은 없앰 — 사용자 결정 2026-11-25).

import type { ChatMessage } from "./chat-source.contract";

type Free = { readonly attempt: 1 | 2 } | null;

/**
 * 지금 내 다음 답이 무료 퀴즈 답인가 — 몇 번째 시도인지, 아니면 null. 퀴즈 반응(ask) 뒤 내 첫 글이 1번, 그 답이 힌트(hint)면 2번(마지막).
 * 판정을 아직 모르는 답 · 맞힘 · 정답 공개 · 퀴즈 표시 없는 내 글 뒤에는 없습니다. 새 퀴즈 반응이 오면 다시 1번입니다.
 */
export function quizFreeOf(messages: readonly ChatMessage[]): Free {
  let free: Free = null;
  for (const message of messages) {
    if (message.kind !== "text") continue;
    const quiz = message.quiz;
    if (message.from === "them") {
      if (quiz?.kind === "ask") free = { attempt: 1 };
      continue;
    }
    free =
      quiz?.kind === "answer" && quiz.attempt === 1 && quiz.result === "hint"
        ? { attempt: 2 }
        : null;
  }
  return free;
}

/** 보낼 내 글(`localId`)이 무료 퀴즈 답인가 — 그 글을 빼고 본 로그가 「다음 답 무료」였는가. 서버 방은 턴 뒤 기록 · 음성을 다시 읽습니다. */
export function quizAnswerPending(messages: readonly ChatMessage[], localId: string): boolean {
  return quizFreeOf(messages.filter((message) => message.id !== localId)) !== null;
}
