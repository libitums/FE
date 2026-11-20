// 레슨 문항 순서를 「새 낱말 카드 → 그 낱말 문제 → 다음 카드 → 그 문제 …」로 맞추는 순수 함수입니다(사용자 결정 2026-11-20,
// 계약 docs/specs/episode-content-json-contract.md 부록 I). IO가 없어 같은 입력이면 같은 결과입니다.
//
// 스텝 안에서만 옮깁니다 — 스텝을 넘어 옮기지 않고, 문항의 id · 내용 · 개수 · 소속 스텝 등 배열 순서 밖의 것은 바꾸지 않습니다.

export const CARD_TYPE = "VOCAB_CARD";

// 문항에 `level`이 없을 때만 쓰는 쉬운 순서입니다. 값은 운영 level-5 판(2026-11-18.1)의 타입별 `level` 관찰값과 같습니다.
const TYPE_RANK = {
  IMG_MATCH: 1,
  PAIR_MATCH: 1,
  TRANSLATE_TO_EN: 1,
  CULTURE_CHECK: 1,
  LISTEN_SELECT: 2,
  CLOZE_CHOICE: 2,
  MIN_PAIR_AB: 2,
  PARTICLE_FILL: 2,
  PARTICLE_SWAP: 2,
  REPLY_SELECT: 2,
  ROLE_LINE: 2,
  CLOZE: 3,
  WORD_ORDER: 3,
  SYLLABLE_BUILD: 3,
  LISTEN_BUILD: 3,
  HANGUL_WRITE: 3,
  SHADOW: 3,
  TURN_ORDER: 3,
  CLOZE_TYPING: 4,
  DICTATION: 4,
  SPEAK_WORD: 4,
  TRANSLATE_TO_KO: 4,
  ROLEPLAY_TURN: 5,
};

// ref가 카드와 같아도 옮기지 않는 타입입니다 — 낱말 문제가 아니고, 앱이 배열 순서로 짝(문화 확인 → 앞의 k번째 문화 카드,
// apps/mobile/src/app/catalog-culture-map.ts)이나 차례(롤플레이 턴)를 정합니다.
const STAY = new Set(["CULTURE_CARD", "CULTURE_CHECK", "ROLEPLAY_TURN"]);

const isCard = (item) => item?.type === CARD_TYPE;
const refOf = (item) => (typeof item?.ref === "string" && item.ref !== "" ? item.ref : null);

/** 쉬운 문항일수록 작은 값입니다 — `level`(수)이 있으면 그것, 없으면 타입 표, 모르는 타입은 맨 뒤. */
export function easeRank(item) {
  if (typeof item?.level === "number" && Number.isFinite(item.level)) return item.level;
  return TYPE_RANK[item?.type] ?? Number.POSITIVE_INFINITY;
}

/**
 * 한 스텝의 `items`를 카드 블록 순서로 다시 놓은 새 배열입니다(입력은 바꾸지 않고, 원소는 같은 객체입니다).
 *
 * - 카드(`VOCAB_CARD`)마다 블록 하나: 카드 → 같은 스텝에서 그 카드의 `ref`를 가리키는 카드 아닌 문항(쉬운 순, 같으면 원래 순).
 *   카드보다 앞에 있던 문항도 그 블록으로 들어간다 — 스텝 안에서 낱말이 카드보다 먼저 나오지 않는다.
 *   같은 `ref` 카드가 둘이면 문항은 첫 카드의 블록으로 간다.
 * - 나머지(ref 없음 · 이 스텝에 카드가 없는 ref — 다른 스텝 · 다른 편 복습 · 문화 카드 · 문화 확인 · 롤플레이 턴)는 원래 바로 앞에 있던 카드의 블록 끝에 원래 순서로 남는다.
 *   첫 카드보다 앞에 있던 것은 스텝 맨 앞에 남는다.
 */
export function reorderStepItems(items) {
  if (!Array.isArray(items)) return items;
  const blockOfCard = new Map();
  const blockOfRef = new Map();
  const blocks = [];
  for (const item of items) {
    if (!isCard(item)) continue;
    const block = { card: item, quizzes: [], tail: [] };
    blocks.push(block);
    blockOfCard.set(item, block);
    const ref = refOf(item);
    if (ref !== null && !blockOfRef.has(ref)) blockOfRef.set(ref, block);
  }
  if (blocks.length === 0) return items.slice();

  const head = [];
  let current = null;
  for (const item of items) {
    if (isCard(item)) {
      current = blockOfCard.get(item);
      continue;
    }
    const target = STAY.has(item?.type) ? undefined : blockOfRef.get(refOf(item));
    if (target) target.quizzes.push(item);
    else (current ? current.tail : head).push(item);
  }

  const out = head.slice();
  for (const block of blocks) {
    const ranked = block.quizzes
      .map((item, index) => ({ item, index, rank: easeRank(item) }))
      .sort((a, b) => a.rank - b.rank || a.index - b.index)
      .map((entry) => entry.item);
    out.push(block.card, ...ranked, ...block.tail);
  }
  return out;
}

/** 에피소드의 모든 스텝에 `reorderStepItems`를 적용한 얕은 사본입니다. 스텝의 다른 키와 에피소드의 다른 키는 그대로입니다. */
export function reorderEpisode(episode) {
  if (!episode || !Array.isArray(episode.steps)) return episode;
  return {
    ...episode,
    steps: episode.steps.map((step) =>
      step && Array.isArray(step.items) ? { ...step, items: reorderStepItems(step.items) } : step,
    ),
  };
}

/** 두 판이 배열 순서 말고는 같은지 봅니다 — 스텝 순서 · 스텝 키 · 각 스텝의 문항 집합(문항 JSON 그대로)이 같아야 합니다. */
export function sameExceptItemOrder(before, after) {
  const strip = (episode) =>
    JSON.stringify({ ...episode, steps: episode.steps.map((step) => ({ ...step, items: null })) });
  if (strip(before) !== strip(after)) return false;
  return before.steps.every((step, index) => {
    const a = step.items;
    const b = after.steps[index].items;
    if (!Array.isArray(a)) return a === b;
    if (!Array.isArray(b) || a.length !== b.length) return false;
    const key = (item) => JSON.stringify(item);
    const sorted = (list) => list.map(key).sort();
    const left = sorted(a);
    const right = sorted(b);
    return left.every((value, i) => value === right[i]);
  });
}

/**
 * 순서 지표입니다. 스텝을 배열 순으로 이어 붙인 「재생 순서」로 셉니다(막간처럼 `items`가 없는 스텝은 빈 스텝).
 * - `cards`: 카드 수, `cardThenQuiz`: 바로 다음 문항이 같은 스텝의 같은 ref 문제인 카드 수
 * - `maxGap` · `medianGap`: 카드에서 그 ref 첫 문제까지 칸 수(그 뒤 문제가 있는 카드만, 재생 순서 기준)
 * - `maxGapInStep`: 위 칸 수 중 첫 문제가 같은 스텝에 있는 카드의 최댓값, `cardsWithoutQuizInStep`: 같은 스텝에 그 낱말 문제가 없는 카드 수
 * - `wordQuizzes`: ref가 있는 카드 아닌 문항 중 카드 · 문화 · 롤플레이를 뺀 것
 * - `beforeCardSameStep` · `beforeCardLaterStep` · `noCardInEpisode`: 그 ref의 카드가 아직 안 나온 문제 — 카드가 같은 스텝 뒤 · 뒤 스텝 · 이 편에 없음
 */
export function orderingStats(episode) {
  const flat = [];
  for (const [stepIndex, step] of (episode?.steps ?? []).entries())
    for (const item of Array.isArray(step?.items) ? step.items : []) flat.push({ item, stepIndex });

  const firstCard = new Map();
  flat.forEach(({ item, stepIndex }, position) => {
    const ref = refOf(item);
    if (isCard(item) && ref !== null && !firstCard.has(ref))
      firstCard.set(ref, { position, stepIndex });
  });

  const nonQuiz = new Set([CARD_TYPE, "CULTURE_CARD", "CULTURE_CHECK", "ROLEPLAY_TURN"]);
  const stats = {
    cards: 0,
    cardThenQuiz: 0,
    maxGap: 0,
    medianGap: 0,
    maxGapInStep: 0,
    cardsWithoutQuizInStep: 0,
    wordQuizzes: 0,
    beforeCardSameStep: 0,
    beforeCardLaterStep: 0,
    noCardInEpisode: 0,
  };
  const gaps = [];
  flat.forEach(({ item, stepIndex }, position) => {
    const ref = refOf(item);
    if (isCard(item)) {
      stats.cards += 1;
      const next = flat[position + 1];
      if (
        next &&
        next.stepIndex === stepIndex &&
        !isCard(next.item) &&
        refOf(next.item) === ref &&
        ref !== null
      )
        stats.cardThenQuiz += 1;
      if (ref !== null) {
        // 카드 뒤부터만 찾습니다(앞부분을 매번 다시 훑지 않게).
        let later = -1;
        for (let at = position + 1; at < flat.length; at += 1) {
          if (!nonQuiz.has(flat[at].item?.type) && refOf(flat[at].item) === ref) {
            later = at;
            break;
          }
        }
        if (later !== -1) gaps.push(later - position);
        if (later !== -1 && flat[later].stepIndex === stepIndex)
          stats.maxGapInStep = Math.max(stats.maxGapInStep, later - position);
        else stats.cardsWithoutQuizInStep += 1;
      } else stats.cardsWithoutQuizInStep += 1;
      return;
    }
    if (ref === null || nonQuiz.has(item?.type)) return;
    stats.wordQuizzes += 1;
    const card = firstCard.get(ref);
    if (!card) stats.noCardInEpisode += 1;
    else if (card.position > position) {
      if (card.stepIndex === stepIndex) stats.beforeCardSameStep += 1;
      else stats.beforeCardLaterStep += 1;
    }
  });
  if (gaps.length > 0) {
    const sorted = gaps.slice().sort((a, b) => a - b);
    stats.maxGap = sorted[sorted.length - 1];
    stats.medianGap = sorted[Math.floor((sorted.length - 1) / 2)];
  }
  return stats;
}

/** `YYYY-MM-DD.n` 다음 판입니다 — 같은 날이면 n + 1, 아니면 그날의 1. 계약 10절 · 13절 규칙 3(더 높게). */
export function nextVersion(previous, today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error(`날짜 형식이 아닙니다: ${today}`);
  const match = /^(\d{4}-\d{2}-\d{2})\.(\d+)$/.exec(previous ?? "");
  if (match && match[1] === today) return `${today}.${Number(match[2]) + 1}`;
  if (match && match[1] > today)
    throw new Error(`이전 판(${previous})이 오늘(${today})보다 뒤입니다`);
  return `${today}.1`;
}

/** 본문 직렬화입니다 — 버킷 본문과 같은 모양(2칸 들여쓰기 + 끝 줄바꿈). 운영 level-5 18편은 이 함수로 바이트가 그대로 돌아온다. */
export function serializeEpisode(episode) {
  return `${JSON.stringify(episode, null, 2)}\n`;
}
