// 들은 말과 정답의 음절 차이입니다(순수). 말하기 결과에서 「다른 음절」에 밑줄을 긋는 데 씁니다(ADR-0201 D6).
//
// 띄어쓰기 · 문장 부호는 비교하지 않고 그대로 남깁니다(다름 표시 없음). 나머지 글자(한글 음절 · 영문 · 숫자)는 최장 공통
// 부분열로 맞추고, 맞춰지지 않은 글자를 다름으로 표시합니다. 이웃한 같은 표시는 한 조각으로 묶습니다.

/** 보이는 조각 하나 — 글자와, 상대 쪽과 다른가입니다. */
export type DiffPiece = { readonly text: string; readonly differs: boolean };

export type SyllableDiff = {
  readonly heard: readonly DiffPiece[];
  readonly expected: readonly DiffPiece[];
};

const SKIPPED = /[\s.,!?~…"'“”‘’·:;()-]/;

const comparable = (char: string): boolean => !SKIPPED.test(char);

/** 비교하는 글자들의 자리(원문 안 번호)입니다. */
function positionsOf(chars: readonly string[]): number[] {
  const positions: number[] = [];
  chars.forEach((char, index) => {
    if (comparable(char)) positions.push(index);
  });
  return positions;
}

/** 두 글자 열의 최장 공통 부분열에 든 자리(각 원문 번호)입니다. */
function commonPositions(
  left: readonly string[],
  right: readonly string[],
): { readonly left: Set<number>; readonly right: Set<number> } {
  const a = positionsOf(left);
  const b = positionsOf(right);
  const table: number[][] = [];
  for (let row = 0; row <= a.length; row += 1) {
    table.push(new Array<number>(b.length + 1).fill(0));
  }
  for (let row = a.length - 1; row >= 0; row -= 1) {
    for (let column = b.length - 1; column >= 0; column -= 1) {
      const current = table[row] ?? [];
      current[column] =
        left[a[row] ?? -1] === right[b[column] ?? -1]
          ? (table[row + 1]?.[column + 1] ?? 0) + 1
          : Math.max(table[row + 1]?.[column] ?? 0, current[column + 1] ?? 0);
    }
  }
  const shared = { left: new Set<number>(), right: new Set<number>() };
  let row = 0;
  let column = 0;
  while (row < a.length && column < b.length) {
    const leftIndex = a[row] ?? -1;
    const rightIndex = b[column] ?? -1;
    if (left[leftIndex] === right[rightIndex]) {
      shared.left.add(leftIndex);
      shared.right.add(rightIndex);
      row += 1;
      column += 1;
    } else if ((table[row + 1]?.[column] ?? 0) >= (table[row]?.[column + 1] ?? 0)) {
      row += 1;
    } else {
      column += 1;
    }
  }
  return shared;
}

function piecesOf(chars: readonly string[], shared: ReadonlySet<number>): DiffPiece[] {
  const pieces: DiffPiece[] = [];
  chars.forEach((char, index) => {
    const differs = comparable(char) && !shared.has(index);
    const last = pieces[pieces.length - 1];
    if (last !== undefined && last.differs === differs) {
      pieces[pieces.length - 1] = { text: last.text + char, differs };
    } else {
      pieces.push({ text: char, differs });
    }
  });
  return pieces;
}

/** 들은 말과 정답을 음절로 맞춰 양쪽의 다른 글자를 표시합니다. 빈 글은 빈 조각 열입니다. */
export function syllableDiff(heard: string, expected: string): SyllableDiff {
  const heardChars = Array.from(heard);
  const expectedChars = Array.from(expected);
  const shared = commonPositions(heardChars, expectedChars);
  return {
    heard: piecesOf(heardChars, shared.left),
    expected: piecesOf(expectedChars, shared.right),
  };
}
