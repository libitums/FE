// 글 → 학습 키보드 자모 열입니다(messenger-chat-ui spec §5.3).
// 계약: 모든 문자열 t에 composeHangul(keysFromText(t)) === t.

import { keystrokesFor, shiftedKeys } from "../../lib/hangul-keyboard";

/**
 * `keystrokesFor`의 윗글쇠 표기("shift" 다음 키)를 쌍자음 한 키로 접고, "space"는 공백 한 칸으로
 * 바꿉니다. 이 열 뒤에 자모를 이어 치면 지금 조합이 이어집니다.
 */
export function keysFromText(text: string): readonly string[] {
  const strokes = keystrokesFor(text);
  const keys: string[] = [];
  for (let i = 0; i < strokes.length; i += 1) {
    const stroke = strokes[i];
    if (stroke === "shift") {
      const next = strokes[i + 1];
      if (next !== undefined) {
        keys.push(shiftedKeys[next] ?? next);
        i += 1;
      }
    } else if (stroke === "space") {
      keys.push(" ");
    } else {
      keys.push(stroke);
    }
  }
  return keys;
}
