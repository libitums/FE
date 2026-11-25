// 덕수쌤 퀴즈의 답(ADR-0191 D14). 퀴즈 반응 뒤 그 방에서 보내는 메시지가 답이다 — 첫 답 무료, 오답이면 다음 한 통도 무료.
// 1. 관문 **전에** `companion_claim_quiz_answer`: 열린 퀴즈의 답이면 서버가 그 메시지에 금액 0 예약을 둔다(친구 스토리 첫 답장 무료와 같은 장치).
// 2. 판정은 여기서 — 답에 그 단어(활용형 포함)가 들어 있는가. 모델을 부르지 않는다.
// 3. 이번 턴 지시: 맞힘(「맞아요, ○○!」) · 첫 오답(힌트 — 단어는 말하지 않음) · 두 번째 오답(정답을 알려 주고 끝, 벌칙 없음).
// 4. 턴이 complete로 끝나면 `companion_quiz_answered`가 결과 · 내 메시지 meta · 친밀도(+2, 맞혔을 때 한 번)를 적는다.
// 판정 · 적기가 실패해도 턴은 보통대로 돈다 — 던지지 않는다.

import { storyText } from "./companion-reaction-prompt.ts";
import { callRpc, type RpcEnv } from "./companion-rpc.ts";
import type { Outbound } from "./delete-account.contract.ts";

/** 퀴즈를 내는 인물 — 이 방의 턴만 판정을 부른다(다른 방은 RPC 한 번을 아낀다). */
export const QUIZ_CHARACTERS: ReadonlySet<string> = new Set(["duksu"]);

export type QuizTurn = {
  readonly attempt: 1 | 2;
  readonly word: string;
  readonly meaning: string;
  readonly correct: boolean;
};

const compact = (text: string) => text.normalize("NFC").replace(/[\s\p{P}\p{S}]/gu, "");

/**
 * 답에서 찾을 꼴 — 단어 그대로(띄어쓰기 · 문장부호 무시)와, 용언이면 어간(「도착하다」 → 「도착」, 「먹다」 → 「먹」).
 * 한 글자 어간(「가다」 → 「가」)은 너무 흔해서 그 글자로 시작하는 어절만 본다.
 */
export function quizForms(word: string): string[] {
  const whole = compact(word);
  if (whole === "") return [];
  const forms = new Set([whole]);
  if (whole.length >= 3 && whole.endsWith("하다")) forms.add(whole.slice(0, -2));
  else if (whole.length >= 2 && whole.endsWith("다")) forms.add(whole.slice(0, -1));
  return [...forms].filter((form) => form !== "");
}

/** 답에 그 단어(활용형 포함)가 들어 있는가. */
export function quizCorrect(answer: string, word: string): boolean {
  const forms = quizForms(word);
  const whole = compact(answer);
  const words = answer
    .normalize("NFC")
    .split(/\s+/u)
    .map((part) => compact(part));
  return forms.some((form) =>
    form.length >= 2 ? whole.includes(form) : words.some((part) => part.startsWith(form)),
  );
}

/** 이번 턴 지시 — 시스템의 이번 턴 지시 맨 앞에 붙는다. 단어는 자료로만 싣는다. */
export function quizDirective(quiz: QuizTurn): string {
  const word = storyText(quiz.word, 40);
  const meaning = storyText(quiz.meaning, 60);
  if (quiz.correct)
    return (
      `The learner is answering the little quiz you gave about their story, and the answer is right: "${word}".` +
      ` Start your reply with "맞아요, ${word}!" and praise them warmly in one short line. The quiz is over — do not ask another quiz.`
    );
  if (quiz.attempt === 1)
    return (
      `The learner is answering the little quiz you gave about their story ("${word}"${meaning === "" ? "" : `, meaning "${meaning}"`}), but the answer is not right yet.` +
      ` Give one small, friendly hint — for example its first syllable "${[...word][0] ?? ""}" or how many syllables it has —` +
      ` and invite them to try once more. Do not write the word "${word}" itself anywhere in your reply.`
    );
  return (
    `The learner tried your little quiz again ("${word}"${meaning === "" ? "" : `, meaning "${meaning}"`}) and it is still not right.` +
    ` Kindly tell them the answer — for example "정답은 ${word}예요!" — with no scolding, and cheer them on. The quiz is over.`
  );
}

/** 열린 퀴즈의 답이면 판정까지. 아니거나 실패하면 null. */
export async function claimQuizAnswer(
  outbound: Outbound,
  env: RpcEnv,
  input: {
    readonly userId: string;
    readonly characterId: string;
    readonly clientMessageId: string;
    readonly text: string;
    readonly now: string;
  },
): Promise<QuizTurn | null> {
  if (!QUIZ_CHARACTERS.has(input.characterId)) return null;
  try {
    const claimed = await callRpc<{
      result?: unknown;
      attempt?: unknown;
      word?: unknown;
      meaning?: unknown;
    } | null>(outbound, env, "companion_claim_quiz_answer", {
      p_user_id: input.userId,
      p_character_id: input.characterId,
      p_client_message_id: input.clientMessageId,
      p_now: input.now,
    });
    if (claimed?.result !== "quiz" || typeof claimed.word !== "string") return null;
    const attempt = claimed.attempt === 2 ? 2 : 1;
    return {
      attempt,
      word: claimed.word,
      meaning: typeof claimed.meaning === "string" ? claimed.meaning : "",
      correct: quizCorrect(input.text, claimed.word),
    };
  } catch {
    return null;
  }
}

/** 턴이 complete로 끝난 뒤 적는다. 실패해도 던지지 않는다(false). */
export async function recordQuizAnswer(
  outbound: Outbound,
  env: RpcEnv,
  input: {
    readonly userId: string;
    readonly clientMessageId: string;
    readonly correct: boolean;
    readonly now: string;
  },
): Promise<boolean> {
  try {
    await callRpc(outbound, env, "companion_quiz_answered", {
      p_user_id: input.userId,
      p_client_message_id: input.clientMessageId,
      p_correct: input.correct,
      p_now: input.now,
    });
    return true;
  } catch {
    return false;
  }
}
