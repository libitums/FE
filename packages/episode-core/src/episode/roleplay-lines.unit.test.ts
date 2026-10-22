import { describe, expect, test } from "vitest";

import { EPISODE_SELF_SPEAKER, roleplayLinesOf, type DialogueLine } from "./index";

// `unit` 계층: 롤플레이 턴의 `line_id`(`D<n>`) → 대화 줄 찾기와 「나」 화자 값.

const line = (seq: number, role: DialogueLine["role"], audioUrl: string): DialogueLine => ({
  seq,
  role,
  text: { ko: `대사${seq}`, roman: `daesa${seq}` },
  audioUrl,
});

/** u00과 같은 꼴 — 상대 · 나가 번갈아 여섯 줄. */
const dialogue: readonly DialogueLine[] = [
  line(1, "counterpart", "u00-tutorial/d-01"),
  line(2, "player", "u00-tutorial/d-02"),
  line(3, "counterpart", "u00-tutorial/d-03"),
  line(4, "player", "u00-tutorial/d-04"),
  line(5, "counterpart", "u00-tutorial/d-05"),
  line(6, "player", "u00-tutorial/d-06"),
];

describe("roleplayLinesOf", () => {
  test("EC3. D2 → seq 2가 내 줄 · seq 1이 상대 줄", () => {
    expect(roleplayLinesOf("D2", dialogue)).toEqual({
      counterpart: dialogue[0],
      player: dialogue[1],
    });
  });

  test("EC3. D4 · D6도 같은 규칙", () => {
    expect(roleplayLinesOf("D4", dialogue)?.counterpart.audioUrl).toBe("u00-tutorial/d-03");
    expect(roleplayLinesOf("D4", dialogue)?.player.audioUrl).toBe("u00-tutorial/d-04");
    expect(roleplayLinesOf("D6", dialogue)?.counterpart.audioUrl).toBe("u00-tutorial/d-05");
    expect(roleplayLinesOf("D6", dialogue)?.player.audioUrl).toBe("u00-tutorial/d-06");
  });

  test("EC3. 앞 줄이 없는 D1 · 모르는 꼴 X2 · 없는 줄 D9는 null", () => {
    expect(roleplayLinesOf("D1", dialogue)).toBeNull();
    expect(roleplayLinesOf("X2", dialogue)).toBeNull();
    expect(roleplayLinesOf("D9", dialogue)).toBeNull();
    expect(roleplayLinesOf("D0", dialogue)).toBeNull();
    expect(roleplayLinesOf("", dialogue)).toBeNull();
  });

  test("EC3. 역할이 뒤바뀌면 null", () => {
    const swapped: readonly DialogueLine[] = [
      line(1, "player", "a/b"),
      line(2, "counterpart", "a/c"),
    ];
    expect(roleplayLinesOf("D2", swapped)).toBeNull();
    // D3은 seq 3이 상대 줄이라 어긋난다
    expect(roleplayLinesOf("D3", dialogue)).toBeNull();
  });
});

describe("EPISODE_SELF_SPEAKER", () => {
  test('EC6. 와이어 「나」 화자 값은 "플레이어"', () => {
    expect(EPISODE_SELF_SPEAKER).toBe("플레이어");
  });
});
