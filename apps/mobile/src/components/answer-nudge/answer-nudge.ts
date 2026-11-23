// 고민 힌트(ADR-0177, 시안 「정답 힌트 그림자」 B안 2026-11-23): 조각을 순서대로 놓는 문제에서 학습자가 한동안 아무것도 누르지 않으면
// 다음에 놓을 정답 조각에 브랜드 색 그림자가 번집니다. 이 파일은 「다음 정답 조각이 무엇인가」만 답하는 순수 함수입니다.
// 이미 틀린 조각이 놓여 있으면 가리키지 않습니다 — 틀린 줄 위에 이어 놓게 이끌지 않습니다.

/** 아무것도 누르지 않고 이만큼 지나면 힌트가 켜집니다. */
export const ANSWER_NUDGE_DELAY_MS = 5000;

/** 문장 조립 — `answerOrder`(조각 인덱스의 정답 순서)와 지금 놓인 조각. 다음에 놓을 조각의 인덱스, 없으면 null. */
export function nextOrderedIndex(
  answerOrder: readonly number[],
  placed: readonly number[],
): number | null {
  if (placed.length >= answerOrder.length) return null;
  for (let i = 0; i < placed.length; i += 1) {
    if (placed[i] !== answerOrder[i]) return null;
  }
  return answerOrder[placed.length] ?? null;
}

/** `rest`를 `tiles`의 남은 타일(`used`에 없는 것)을 이어 만들 수 있는가 — 타일 수가 `room`을 넘지 않게. */
function canBuild(
  rest: string,
  tiles: readonly string[],
  used: readonly number[],
  room: number,
): boolean {
  if (rest === "") return true;
  if (room <= 0) return false;
  for (let index = 0; index < tiles.length; index += 1) {
    const text = tiles[index];
    if (text === undefined || text === "" || used.includes(index)) continue;
    if (rest.slice(0, text.length) !== text) continue;
    if (canBuild(rest.slice(text.length), tiles, [...used, index], room - 1)) return true;
  }
  return false;
}

/**
 * 음절 조립 — 정답은 낱말(여럿일 수 있음)이고 타일은 글자입니다. 놓은 글자를 이은 것이 어느 정답의 앞부분일 때, 창고에 남은 타일 중
 * 그 정답을 이어 가는 첫 타일의 인덱스. 칸(`slotCount`)이 다 찼으면 null — 그 뒤의 타일은 누를 수 없습니다. 남은 타일과 남은 칸으로
 * 끝까지 만들 수 없는 정답 쪽으로는 이끌지 않습니다.
 */
export function nextTileForWords(
  tiles: readonly string[],
  answers: readonly string[],
  placed: readonly number[],
  slotCount: number,
): number | null {
  if (placed.length >= slotCount) return null;
  let built = "";
  for (const index of placed) built += tiles[index] ?? "";
  for (let index = 0; index < tiles.length; index += 1) {
    const text = tiles[index];
    if (text === undefined || text === "" || placed.includes(index)) continue;
    const next = built + text;
    for (const answer of answers) {
      if (answer.slice(0, next.length) !== next) continue;
      const room = slotCount - placed.length - 1;
      if (canBuild(answer.slice(next.length), tiles, [...placed, index], room)) return index;
    }
  }
  return null;
}
