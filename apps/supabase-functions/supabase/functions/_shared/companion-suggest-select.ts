// 칩 후보 검증 · 고르기(설계 문서 §05 ~ §07). 모델이 낸 후보 셋을 하나씩 검사해 못 지난 것만 빼고(셋 전체를 버리지 않는다), 지난 것
// 가운데 의도가 서로 다른 것을 앞에서부터 `displayMax`개까지 고른다 — 억지로 채우지 않는다. 후보와 검사 결과는 모두 저장해 평가 ·
// 지표(`dropReasons`)에 쓰고, 앱에는 고른 것만 간다.

import type { ReplySuggestion, SuggestionIntent } from "./companion-contract/index.ts";
import type { ChoiceSet, SuggestionDraft } from "./companion-suggest.contract.ts";
import { suggestionMeaningLanguage } from "./companion-suggest-prompts.ts";

/** 보일 칩 수의 기본값(`settings.suggestion_display_max`를 모르는 옛 DB). */
export const defaultSuggestionDisplayMax = 2;

export const suggestionIntents: readonly SuggestionIntent[] = [
  "elaborate",
  "ask",
  "reflect",
  "redirect",
  "boundary",
  "progress",
];

const textMin = 4;
const textMax = 80;
const hangulText = /[가-힣]/;
const markup = /[*<>`#{}]|https?:\/\//i;
// 전화번호 · 이메일 꼴. 프롬프트가 금지하지만 숫자 · 주소가 섞이면 보이지 않는다(개인정보 · 연락처).
const contact = /\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{4}|[\w.+-]+@[\w-]+\.[\w.]+/;
const duplicateAt = 0.75;
const repeatAt = 0.85;

/** 후보를 뺀 까닭. `blocked`는 미성년자 · 나이 모름의 출력 검사(`companion-suggest-generate.ts`)가 붙인다. */
export type DropReason =
  | "unknown_intent"
  | "empty"
  | "no_hangul"
  | "markup"
  | "too_short"
  | "too_long"
  | "missing_meaning"
  | "contact_info"
  | "duplicate"
  | "repeat_recent"
  | "blocked";

/** 후보 하나와 검사 결과. 지나면 `reason`이 없고, 골라 보였으면 `shown`. */
export type CandidateRecord = {
  readonly text: string;
  readonly meaning: string | null;
  readonly intent: string;
  readonly reason?: DropReason;
  readonly shown: boolean;
};

/** 비교용 — 공백 · 문장부호 · 기호를 걷는다. */
const normalize = (text: string) => text.replace(/[\s\p{P}\p{S}]/gu, "").toLowerCase();

function bigrams(text: string): Map<string, number> {
  const chars = [...text];
  const grams = new Map<string, number>();
  for (let i = 0; i < chars.length - 1; i += 1) {
    const gram = chars[i]! + chars[i + 1]!;
    grams.set(gram, (grams.get(gram) ?? 0) + 1);
  }
  return grams;
}

/** 글자 두 개씩의 Dice 계수(0 ~ 1). 정규화한 글끼리 비교한다 — 같으면 1. */
export function similarity(a: string, b: string): number {
  const left = normalize(a);
  const right = normalize(b);
  if (left === right) return 1;
  const x = bigrams(left);
  const y = bigrams(right);
  const total = [...x.values(), ...y.values()].reduce((sum, n) => sum + n, 0);
  if (total === 0) return 0;
  let shared = 0;
  for (const [gram, n] of x) shared += Math.min(n, y.get(gram) ?? 0);
  return (2 * shared) / total;
}

/** 앞의 통과 후보 · 지난 칩 글과의 비교를 빼고 후보 하나만 보는 검사. 지나면 undefined. */
function shapeReason(
  intent: string,
  text: string,
  meaning: string | null,
  meaningRequired: boolean,
): DropReason | undefined {
  const length = [...text].length;
  if (!suggestionIntents.includes(intent as SuggestionIntent)) return "unknown_intent";
  if (text === "") return "empty";
  if (!hangulText.test(text)) return "no_hangul";
  if (markup.test(text)) return "markup";
  if (length < textMin) return "too_short";
  if (length > textMax) return "too_long";
  if (meaningRequired && meaning === null) return "missing_meaning";
  if (contact.test(text)) return "contact_info";
  return undefined;
}

/** 후보마다 검사한다(순서 그대로). 앞의 통과한 후보와 겹치거나 지난 칩 셋의 글과 거의 같으면 뺀다. */
export function checkCandidates(
  drafts: readonly SuggestionDraft[],
  l1: string | null,
  recent: readonly ChoiceSet[] = [],
): CandidateRecord[] {
  const language = suggestionMeaningLanguage(l1);
  const pastTexts = recent.flatMap((set) => set.items.map((item) => item.text));
  const passed: string[] = [];
  return drafts.map((draft): CandidateRecord => {
    const text = (draft.text ?? "").trim();
    const meaning = language === null ? null : draft.meaning?.trim() || null;
    const record = { text, meaning, intent: draft.intent, shown: false };
    const reason =
      shapeReason(draft.intent, text, meaning, language !== null) ??
      (passed.some((other) => similarity(other, text) >= duplicateAt)
        ? "duplicate"
        : pastTexts.some((other) => similarity(other, text) >= repeatAt)
          ? "repeat_recent"
          : undefined);
    if (reason !== undefined) return { ...record, reason };
    passed.push(text);
    return record;
  });
}

/** 통과한 후보에서 의도가 서로 다른 것을 앞에서부터 고르고, 자리가 남으면 남은 통과 후보로 채운다. `shown`을 표시해 돌려준다. */
export function pickShown(
  records: readonly CandidateRecord[],
  displayMax: number,
): { readonly items: ReplySuggestion[]; readonly candidates: CandidateRecord[] } {
  const valid = records.map((record, index) => ({ record, index })).filter((x) => !x.record.reason);
  const chosen: number[] = [];
  const intents = new Set<string>();
  for (const { record, index } of valid) {
    if (chosen.length >= displayMax) break;
    if (intents.has(record.intent)) continue;
    intents.add(record.intent);
    chosen.push(index);
  }
  for (const { index } of valid) {
    if (chosen.length >= displayMax) break;
    if (!chosen.includes(index)) chosen.push(index);
  }
  chosen.sort((a, b) => a - b);
  return {
    items: chosen.map((index) => {
      const { text, meaning, intent } = records[index]!;
      return { text, meaning, intent: intent as SuggestionIntent };
    }),
    candidates: records.map((record, index) => ({ ...record, shown: chosen.includes(index) })),
  };
}
