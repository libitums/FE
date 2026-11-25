// 덕수쌤 퀴즈의 답(ADR-0191 D14). 퀴즈 반응 뒤 그 방에서 보내는 메시지가 답이다 — 첫 답 무료, 오답이면 다음 한 통도 무료.
// 1. 관문 **전에** `companion_claim_quiz_answer`: 열린 퀴즈의 답이면 서버가 그 메시지에 금액 0 예약을 둔다(친구 스토리 첫 답장 무료와 같은 장치).
// 2. 판정은 여기서 — 답에 그 단어(활용형 포함)가 들어 있는가. 모델을 부르지 않는다.
// 3. 이번 턴 지시: 맞힘(「맞아요, ○○!」) · 첫 오답(힌트 — 단어는 말하지 않음) · 두 번째 오답(정답을 알려 주고 끝, 벌칙 없음) ·
//    퀴즈와 상관없는 말 · 넘어가는 말(그 말에 답하고 퀴즈를 놓아준다 — 메시지는 무료로 두고 퀴즈를 닫는다). 코드가 못 잡은 맞힘
//    (불규칙 활용 등)과 상관없는 말은 답을 만드는 모델이 `@state`의 `quiz`로 가른다(호출을 더하지 않는다).
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

export type QuizResult = "correct" | "wrong" | "skip";

const QUIZ_STATE =
  ' In your @state line, also add "quiz": "correct" (they gave the word), "wrong" (they tried but it is not the word, or said they do not know) or "skip" (their message is about something else, or they want to move on).';

/**
 * 이번 턴 지시 — 시스템의 이번 턴 지시 맨 앞에 붙는다. 단어는 자료로만 싣는다.
 * 코드가 맞힘으로 본 답은 바로 맞힘. 아니면 모델이 이 메시지를 가른다 — 맞힘(활용이 달라도) · 틀림(힌트 또는 정답 공개) ·
 * 퀴즈와 상관없는 말 · 넘어가는 말(그 말에 답하고 퀴즈는 놓아준다). 모델은 `@state`의 `quiz`로 알린다.
 */
export function quizDirective(quiz: QuizTurn): string {
  const word = storyText(quiz.word, 40);
  const meaning = storyText(quiz.meaning, 60);
  const about = `"${word}"${meaning === "" ? "" : `, meaning "${meaning}"`}`;
  if (quiz.correct)
    return (
      `The learner is answering the little quiz you gave about their story, and the answer is right: "${word}".` +
      ` Start your reply with "맞아요, ${word}!" and praise them warmly in one short line. The quiz is over — do not ask another quiz.` +
      QUIZ_STATE
    );
  const wrong =
    quiz.attempt === 1
      ? ` give one small, friendly hint — for example its first syllable "${[...word][0] ?? ""}" or how many syllables it has —` +
        ` and invite them to try once more (do not write "${word}" itself anywhere in your reply)`
      : ` kindly tell them the answer — for example "정답은 ${word}예요!" — with no scolding, and cheer them on; the quiz is over`;
  return (
    `Earlier you gave the learner a little quiz about their story (the answer is ${about}). Decide what their message is:` +
    ` if it gives that word (any conjugation or small spelling slip counts), start with "맞아요, ${word}!" and praise them briefly — the quiz is over;` +
    ` if they try but it is not that word, or say they do not know,${wrong};` +
    " if it is about something else or they want to move on, just reply to what they said, naturally and in character —" +
    ` do not push the quiz, give no hint and do not say "${word}".` +
    QUIZ_STATE
  );
}

/** 이 턴의 결과 — 코드가 맞힘으로 봤으면 맞힘, 아니면 모델의 판정(없으면 틀림). */
export function quizResultOf(quiz: QuizTurn, judged: QuizResult | undefined): QuizResult {
  return quiz.correct ? "correct" : (judged ?? "wrong");
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
    readonly result: QuizResult;
    readonly now: string;
  },
): Promise<boolean> {
  try {
    await callRpc(outbound, env, "companion_quiz_answered", {
      p_user_id: input.userId,
      p_client_message_id: input.clientMessageId,
      p_result: input.result,
      p_now: input.now,
    });
    return true;
  } catch {
    return false;
  }
}
