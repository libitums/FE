// 초안 쓰기의 모델 출력 → 넣을 초안(ADR-0192 D6 · D8). 순수 — 런타임 중립.
// - 로마자는 여기서 만든다(`korean-romanize.ts`) — 모델이 쓴 로마자에는 없는 글자가 섞였다.
// - 날짜는 빈 자리 안의 것만, 날짜마다 하나. 글은 줄바꿈을 지우고 길이를 자른다. 추천 답안이 없으면 그 날은 버린다.
// - 단어(D6): 한 줄을 쓸 때 카탈로그에 맞추지 않는다 — 다 쓴 한 줄에 카탈로그 단어가 들어 있을 때만 붙인다. 모델이 고른 단어(덕수쌤)가
//   카탈로그에 있고 한 줄에서 확인되면 그것, 아니면 한 줄에 **낱말로** 들어 있는 가장 긴 체언(뒤가 끝이거나 조사). 용언은 모델이 고른 것만 —
//   같은 꼴의 다른 뜻(눈이 내리다 · 차에서 내리다)을 가릴 수 없다. 글자만 겹치는 것(눈사람의 「사람」)은 붙이지 않는다.
//   틀린 단어가 모두에게 붙는 것보다 놓치는 쪽이 낫다 — 최종 승인에서 사람이 단어를 보고 고칠 수 있다.

import type { WrittenStory } from "./companion-story-studio-llm.ts";
import { romanize } from "./korean-romanize.ts";
import type { CatalogWord, SlotPlan } from "./companion-story-studio-prompts.ts";
import type { StoryShot } from "./companion-story-studio-shots.ts";

export type DraftItem = {
  readonly characterId: string;
  readonly publishOn: string;
  readonly topic: string;
  readonly note: string;
  readonly ko: string;
  readonly roman: string;
  readonly meaning: { readonly en: string };
  readonly replies: readonly string[];
  readonly word: { readonly episodeId: string; readonly ref: string; readonly ko: string } | null;
  readonly shot: StoryShot;
  readonly scene: string;
};

const flat = (text: string, max: number) =>
  [...text.replace(/\s+/gu, " ").trim()].slice(0, max).join("").trimEnd();

/** 체언 뒤에 붙을 수 있는 말(조사 · 서술격). 「요」 하나는 뺐다 — 「하나요?」가 「하나」로 읽힌다. */
const PARTICLES = new Set(
  (
    "은 는 이 가 을 를 에 의 도 와 과 로 으로 에서 부터 까지 만 랑 이랑 하고 처럼 보다 께 한테 에게 들 " +
    "예요 이에요 입니다 이다 야 이야 네요 이네요 죠 이죠 인데 인데요 이라서 라서"
  ).split(" "),
);
const HANGUL = /[가-힣]/u;
/** 한 줄의 낱말들(한글이 이어진 토막). */
const tokensOf = (line: string) => line.split(/[^가-힣]+/u).filter((token) => token !== "");
/** 받침을 뗀 음절(「맵」 → 「매」). 한글 음절이 아니면 그대로. */
const withoutFinal = (char: string) => {
  const code = char.charCodeAt(0) - 0xac00;
  return code < 0 || code > 11171 ? char : String.fromCharCode(0xac00 + code - (code % 28));
};
const finalOf = (char: string) => (char.charCodeAt(0) - 0xac00) % 28;

/**
 * 체언(「-다」로 끝나지 않는 말)이 한 줄에 **낱말로** 들어 있는가 — 낱말의 처음에 있고, 뒤는 끝이거나 조사(둘까지)다.
 * 다른 낱말의 일부(눈사람의 「사람」 · 포장마차의 「포장」 · 어느새의 「어느」)는 세지 않는다.
 */
export function nounInLine(line: string, word: string): boolean {
  const ko = word.trim();
  if ([...ko].length < 2 || !HANGUL.test(ko)) return false;
  return tokensOf(line).some((token) => {
    if (!token.startsWith(ko)) return false;
    const rest = token.slice(ko.length);
    if (rest === "" || PARTICLES.has(rest)) return true;
    for (let cut = 1; cut < rest.length; cut += 1)
      if (PARTICLES.has(rest.slice(0, cut)) && PARTICLES.has(rest.slice(cut))) return true;
    return false;
  });
}

/**
 * 용언(「-다」)이 한 줄에 활용되어 들어 있는가 — 낱말이 어간으로 시작한다. 「-하다」는 하 · 해 · 했, ㅂ 불규칙은 워 · 우 · 운,
 * 받침 없는 어간은 받침이 붙은 꼴(가다 → 갔어요)도 본다. 모델이 그 단어를 썼다고 고른 것을 확인하는 데만 쓴다 — 뜻이 다른 같은 꼴
 * (눈이 내리다 · 차에서 내리다)을 가릴 수 없어 혼자 찾는 데는 쓰지 않는다.
 */
export function verbInLine(line: string, word: string): boolean {
  const ko = word.trim();
  if (!ko.endsWith("다") || [...ko].length < 2) return false;
  const tokens = tokensOf(line);
  if (ko.endsWith("하다") && ko.length > 2) {
    const root = ko.slice(0, -2);
    return tokens.some((token) =>
      ["하", "해", "했", "한", "할", "합"].some((tail) => token.startsWith(root + tail)),
    );
  }
  const stem = ko.slice(0, -1);
  const [head, last] = [stem.slice(0, -1), stem.slice(-1)];
  return tokens.some((token) => {
    if (token.length <= stem.length - 1 || !token.startsWith(head)) return false;
    const at = token[head.length]!;
    if (at === last) return true;
    // 받침 없는 어간 + 받침(갔 · 간 · 갈 · 갑).
    if (finalOf(last) === 0 && withoutFinal(at) === last) return true;
    // ㅂ 불규칙(맵다 → 매워요 · 매운).
    return (
      finalOf(last) === 17 &&
      at === withoutFinal(last) &&
      ["워", "우", "운", "울"].includes(token[head.length + 1] ?? "")
    );
  });
}

/**
 * 한 줄에 붙일 카탈로그 단어. `hint`(모델이 고른 것 — 덕수쌤)가 카탈로그에 있고 한 줄에서 확인되면 그것.
 * 아니면 한 줄에 낱말로 들어 있는 가장 긴 체언. 용언은 혼자 찾지 않는다. 없으면 null.
 */
export function catalogWordFor(
  line: string,
  hint: string | null,
  catalog: readonly CatalogWord[],
): CatalogWord | null {
  const picked = hint === null ? undefined : catalog.find((word) => word.ko.trim() === hint.trim());
  if (picked !== undefined) {
    const found = picked.ko.trim().endsWith("다")
      ? verbInLine(line, picked.ko)
      : nounInLine(line, picked.ko);
    if (found) return picked;
  }
  let best: CatalogWord | null = null;
  for (const word of catalog) {
    if (word.ko.trim().endsWith("다") || !nounInLine(line, word.ko)) continue;
    if (best === null || [...word.ko].length > [...best.ko].length) best = word;
  }
  return best;
}

export function draftItems(
  written: readonly WrittenStory[],
  input: {
    readonly characterId: string;
    /** 쓰라고 준 자리들 — 컷은 여기서 온다(모델이 고르지 않는다). */
    readonly slots: readonly SlotPlan[];
    readonly catalog: readonly CatalogWord[];
  },
): DraftItem[] {
  const left = new Map(input.slots.map((slot) => [slot.day, slot]));
  const items: DraftItem[] = [];
  for (const story of written) {
    const slot = left.get(story.day);
    if (slot === undefined) continue;
    const ko = flat(story.ko, 120);
    // 로마자는 모델이 쓰지 않는다 — 읽는 법(숫자 · 로마자를 한글로 푼 글)을 규칙으로 옮긴다. 읽는 법이 비었으면 한 줄에서.
    // 읽는 법은 한 줄에 숫자 · 로마자가 있을 때만 쓴다 — 모델이 소리 나는 대로 고쳐 적은 글(「따뜨탄」)이 로마자를 흐트러뜨리지 않게.
    const reading = /[0-9A-Za-z]/.test(ko) ? flat(story.reading, 200) : "";
    const roman = flat(romanize(reading || ko), 400);
    const en = flat(story.en, 300);
    const replies = [...new Set(story.replies.map((reply) => flat(reply, 40)))]
      .filter((reply) => reply !== "")
      .slice(0, 3);
    if (ko === "" || roman === "" || en === "" || replies.length === 0) continue;
    left.delete(story.day);
    const word = catalogWordFor(ko, story.word, input.catalog);
    items.push({
      characterId: input.characterId,
      publishOn: story.day,
      topic: flat(story.topic, 200) || flat(slot.topic ?? "", 200),
      note: flat(story.note, 800),
      ko,
      roman,
      meaning: { en },
      replies,
      word: word === null ? null : { episodeId: word.episodeId, ref: word.ref, ko: word.ko },
      shot: slot.shot,
      scene: flat(story.scene, 600),
    });
  }
  return items;
}
