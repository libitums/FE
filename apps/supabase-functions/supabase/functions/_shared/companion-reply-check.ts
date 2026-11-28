// 답장 규칙 검사(2026-11-28 Haiku 평가 루프 i10). 다 만든 답을 코드로 보고, 어긴 것이 있으면 그 턴만 한 번 다시 만든다.
// 걸러 내는 것: 질문 둘 이상 · 말풍선 넷 이상 · 말 단계 깨짐(해요체에 반말 끝 · 반말에 -요) · 말풍선의 영어 메모.
// 말 단계는 문장 끝 몇 가지 꼴만 본다 — 명사로 끝난 감탄(「정답!」)은 말 단계를 알 수 없어 넘긴다(놓침은 있어도 오탐은 적게).

import type { SpeechLevel } from "./companion-contract/index.ts";

export type CheckSegment = { readonly kind: string; readonly text: string };
export type ReplyViolation =
  | "empty"
  | "questions"
  | "bubbles"
  | "speech-level"
  | "meta"
  | "meeting"
  | "repeat"
  | "long";

const casualEnding =
  /(겠다|었다|았다|였다|했다|한다|는다|이다|이야|거야|잖아|할래|볼래|하자|가자|먹자|구나|는군|겠네|었네|았네|좋네|하네|해봐|해 봐|먹어봐|있어|없어|좋아|싫어|했어|봤어|먹었어|갔어|알아|몰라|맞아|그래|할게|줄게|볼게|해 줘|해줘)$/;
const politeEnding = /(요|니다|니까|세요|죠)$/;

/** 문장 끝 낱말 — 뒤의 기호 · 이모지 · ㅎㅎ/ㅋㅋ · 물결을 걷어 낸다. */
const sentenceEnds = (text: string): string[] =>
  text
    .split(/(?<=[.!?？！~…])\s+/)
    .map((sentence) =>
      sentence
        .replace(/[\s.!?？！~…,'"「」『』()\]\[]+$/u, "")
        .replace(/[\p{Extended_Pictographic}‍️]+$/u, "")
        .replace(/(ㅎ|ㅋ|ㅠ|ㅜ)+$/u, "")
        .replace(/[\s.!?？！~…,]+$/u, ""),
    )
    .filter((end) => /[가-힣]$/.test(end));

/** 말 단계에 어긋나는 문장이 있나. 따옴표 안(가르치는 예문)은 보지 않는다. */
function breaksLevel(text: string, level: SpeechLevel): boolean {
  const spoken = text.replace(/'[^']*'|"[^"]*"|「[^」]*」|‘[^’]*’|“[^”]*”/g, "");
  return sentenceEnds(spoken).some((end) => {
    const last = end.split(/\s+/).pop() ?? "";
    if (level === "polite")
      return last.length >= 2 && casualEnding.test(last) && !politeEnding.test(last);
    return politeEnding.test(last) && !/^(네요|아니요|네|예)$/.test(last);
  });
}

/** 말풍선 대부분이 영어 문장이고 규칙 · 고침 말이 섞였으면 메모가 샌 것으로 본다. */
const looksMeta = (text: string): boolean => {
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  const hangul = (text.match(/[가-힣]/g) ?? []).length;
  if (latin > 15 && hangul === 0) return true; // 한국어 캐릭터의 한글 없는 영어 말풍선 = 속말이 샌 것(「Oops, that has two questions? No — only one. Fine.」)
  return (
    latin > 20 &&
    latin > hangul * 2 &&
    /\b(wait|oops|let me|rule|state|fix|redo|should|I need|I'll|instead)\b/i.test(text)
  );
};

/** 한국어 자기 수정이 말풍선에 남은 것(「여러분... 아니, 학생!」 · 「…구나... 아니, …군요」 · 「들어가세요, 아니 주무세요」). */
const looksSelfFix = (text: string): boolean =>
  /(\.\.\.|…)\s*아니(요)?[,，]?\s/.test(text) || /(요|다)[,，]\s*아니(요)?[,，]?\s/.test(text);

/**
 * 실제 만남 · 기다림 약속(「…앞에서 기다리고 있을게요」 · 「거기서 만나요」). 장난스러운 바람(「같이 가면 좋겠다」)과
 * 장면 안의 환대(게스트하우스 · 가게 인물의 「오면 밥 준비해 둘게요」)는 허용한다(2026-11-28 결정).
 */
const looksMeeting = (text: string): boolean =>
  /(앞|에서|마당|가게|역|공항)[^.!?]{0,15}(기다리고 있을게|기다릴게)|[가-힣]에서 (만나요|만나자|봐요)(?![?？])|만나러 갈게|데리러 갈게/.test(
    text,
  );

/** 말풍선 첫 낱말(「헐,」 → 헐). */
const openerOf = (text: string): string | null => /^\s*([가-힣A-Za-z]+)/.exec(text)?.[1] ?? null;
/** 말풍선 첫 다섯 글자(기호 · 띄어쓰기 빼고) — 「한국어로는 ~라고 해요」 같은 같은 틀을 잡는다. 이름(넉 자 안팎)은 대개 걸리지 않는다. */
const frameOf = (text: string): string | null => {
  const letters = text.replace(/[^가-힣A-Za-z]/g, "");
  return letters.length >= 5 ? letters.slice(0, 5) : null;
};
const speechOf = (segments: readonly CheckSegment[]): string[] =>
  segments.filter((segment) => segment.kind === "speech").map((segment) => segment.text);

/**
 * 지난 답들과 같은 꼴을 되풀이하나(i15) — 첫 말풍선의 첫 낱말이 지난 세 답 중 둘 이상과 같거나(매 답 「헐,」),
 * 어느 말풍선의 첫 다섯 글자가 지난 여덟 답 중 둘 이상에 이미 나왔다(매 답 「한국어로는 …」).
 */
function repeatsRecent(
  segments: readonly CheckSegment[],
  previous: readonly (readonly CheckSegment[])[],
): boolean {
  const lines = speechOf(segments);
  if (lines.length === 0 || previous.length === 0) return false;
  const opener = openerOf(lines[0] ?? "");
  const recentOpeners = previous.slice(-3).map((reply) => openerOf(speechOf(reply)[0] ?? ""));
  if (opener !== null && recentOpeners.filter((other) => other === opener).length >= 2) return true;
  const seen = new Map<string, number>();
  for (const reply of previous.slice(-8))
    for (const frame of new Set(speechOf(reply).map(frameOf)))
      if (frame !== null) seen.set(frame, (seen.get(frame) ?? 0) + 1);
  return lines.some((line) => {
    const frame = frameOf(line);
    return frame !== null && (seen.get(frame) ?? 0) >= 2;
  });
}

/** 말풍선 하나가 65자를 넘는다(프롬프트는 60자 안쪽) — 초급에게 길고 어려운 설명이 여기서 나온다. */
const longLine = (text: string): boolean => text.length > 65;

export function replyViolations(
  segments: readonly CheckSegment[],
  level: SpeechLevel,
  previous: readonly (readonly CheckSegment[])[] = [],
): ReplyViolation[] {
  const speech = segments.filter((segment) => segment.kind === "speech");
  const found: ReplyViolation[] = [];
  if (speech.length === 0) found.push("empty");
  // 「소고기요?」 · 「뭐?」 같은 짧은 되묻기 · 퀴즈 메아리는 질문으로 세지 않는다.
  const questions = speech
    .flatMap((segment) => segment.text.split(/(?<=[?？])/))
    .filter(
      (sentence) =>
        /[?？]\s*$/.test(sentence) && (sentence.match(/[가-힣A-Za-z]/g) ?? []).length > 4,
    )
    // 퀴즈(「김 더하기 밥은?」 · 「뭘까요?」)와 맞장구(「따뜻하죠?」)는 대화 질문으로 세지 않는다(i16 — 다시 만들어도 38%가 그대로였다).
    .filter(
      (sentence) => !/(더하기|\+|뭘까요|무엇일까요|뭐게요|(죠|지요)\s*[?？]\s*$)/.test(sentence),
    ).length;
  if (questions > 1) found.push("questions");
  if (segments.length > 3) found.push("bubbles");
  if (speech.some((segment) => breaksLevel(segment.text, level))) found.push("speech-level");
  if (segments.some((segment) => looksMeta(segment.text) || looksSelfFix(segment.text)))
    found.push("meta");
  if (speech.some((segment) => looksMeeting(segment.text))) found.push("meeting");
  if (repeatsRecent(segments, previous)) found.push("repeat");
  if (speech.some((segment) => longLine(segment.text))) found.push("long");
  return found;
}

const violationNote: Record<ReplyViolation, string> = {
  empty: 'it had no spoken line — write at least one "@speech " line',
  questions: "it asked more than one question — keep only the best one, at the end",
  bubbles: "it had more than 3 bubbles — use 1 or 2",
  "speech-level": "a spoken line broke the speech level",
  repeat:
    "it opened or was shaped the same way as your recent replies (same first word or same sentence frame) — say it differently this time",
  long: "a bubble was too long — keep each bubble to one short, easy sentence (under 60 Korean characters)",
  meeting:
    "it promised to really meet or wait somewhere — you live in this chat, so keep it a playful wish without a place or time",
  meta: 'it contained notes, English commentary or a visible self-correction ("… 아니, …") — write the right line only',
};

/** 다시 만들 때 이번 턴 지시 끝에 붙이는 한 줄. */
export const retryDirective = (found: readonly ReplyViolation[]): string =>
  `Your first draft of this reply broke a rule: ${found.map((code) => violationNote[code]).join("; ")}. Write the reply again from scratch, following every rule. Do not mention the draft.`;

/**
 * 행동 · 묘사 줄이 두 답 연달아 오면 이번 답의 그것을 뺀다(호출 없이 코드로, i11). 말이 하나도 안 남으면 그대로 둔다.
 * 운영에서는 조각을 보내기 전에 거를 수 있다 — 지난 답에 행동 줄이 있었는지만 알면 된다.
 */
export function dropRepeatedAction<T extends CheckSegment>(
  segments: readonly T[],
  previous: readonly CheckSegment[] | null,
): T[] {
  const hadAction = previous?.some((segment) => segment.kind !== "speech") ?? false;
  if (!hadAction) return [...segments];
  const kept = segments.filter((segment) => segment.kind === "speech");
  return kept.length > 0 ? kept : [...segments];
}
