import { hangulKeyRows, shiftedKeys } from "./hangul-keyboard";

// 자판 칸 배치입니다(순수, ADR-0112). 한 줄은 10칸 격자이고 칸끼리 맞닿아 틈이 없습니다 — 칸 전체가
// 터치 대상이고 보이는 키는 칸 안에 그립니다. 자모 줄의 값은 `hangulKeyRows`를 그대로 읽습니다.

export type KeyboardCellKind = "jamo" | "shift" | "backspace" | "space" | "symbol";

export type KeyboardCell = {
  /** test-id 꼬리 — 자모 그대로, `shift` · `backspace` · `space` · `.` · `?` */
  readonly id: string;
  readonly kind: KeyboardCellKind;
  /** 줄 안 비율. 한 줄의 합은 10입니다. */
  readonly flex: number;
  /** 보이는 키가 칸 안 어디에 붙는가 */
  readonly align: "center" | "end" | "start";
  /** 보이는 키 폭 / 칸 폭 */
  readonly keyWidthRatio: number;
  /** 누르는 동안 위에 글자 미리보기를 띄우는가 */
  readonly preview: boolean;
};

// 기능 키(윗글쇠 · 지우기)와 둘째 줄 양 끝 칸의 비율입니다 — 반 칸이 붙습니다.
const WIDE = 1.5;

function cell(
  id: string,
  kind: KeyboardCellKind,
  flex = 1,
  align: KeyboardCell["align"] = "center",
  keyWidthRatio = 1,
): KeyboardCell {
  return { id, kind, flex, align, keyWidthRatio, preview: kind === "jamo" || kind === "symbol" };
}

function jamoRow(keys: readonly string[] | undefined): KeyboardCell[] {
  return (keys ?? []).map((key) => cell(key, "jamo"));
}

// 둘째 줄은 9칸이라 양 끝에 반 칸씩 남습니다. 그 반 칸은 끝 자모(ㅁ · ㅣ)가 터치 영역으로 차지하고,
// 보이는 키는 안쪽으로 붙어 다른 키와 같은 폭입니다(시스템 자판과 같은 방식).
function middleRow(keys: readonly string[] | undefined): KeyboardCell[] {
  const list = keys ?? [];
  return list.map((key, index) => {
    if (index === 0) return cell(key, "jamo", WIDE, "end", 1 / WIDE);
    if (index === list.length - 1) return cell(key, "jamo", WIDE, "start", 1 / WIDE);
    return cell(key, "jamo");
  });
}

export const keyboardLayout: readonly (readonly KeyboardCell[])[] = [
  jamoRow(hangulKeyRows[0]),
  middleRow(hangulKeyRows[1]),
  [
    cell("shift", "shift", WIDE),
    ...jamoRow(hangulKeyRows[2]),
    cell("backspace", "backspace", WIDE),
  ],
  [cell(".", "symbol", WIDE), cell("space", "space", 7), cell("?", "symbol", WIDE)],
];

/** 보이는 키 글자입니다. 윗글쇠 · 지우기는 아이콘이라 빈 문자열입니다. */
export function keyLabel(target: KeyboardCell, shifted: boolean): string {
  switch (target.kind) {
    case "jamo":
      return shifted ? (shiftedKeys[target.id] ?? target.id) : target.id;
    case "space":
      return "space";
    case "symbol":
      return target.id;
    default:
      return "";
  }
}

/** 윗글쇠로 바뀌는 자모의 모서리 힌트입니다. 윗글쇠가 켜져 있으면(이미 그 글자가 보이면) 없습니다. */
export function keyHint(target: KeyboardCell, shifted: boolean): string | null {
  if (target.kind !== "jamo" || shifted) return null;
  return shiftedKeys[target.id] ?? null;
}
