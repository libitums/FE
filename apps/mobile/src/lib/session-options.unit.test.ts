import { describe, expect, it } from "vitest";

import {
  initialSessionOptions,
  sessionOptionAccessibilityLabel,
  sessionOptionKeys,
  sessionOptionLabel,
  sessionOptionStateLabel,
  toggleSessionOption,
  type SessionOptionKey,
} from "./session-options";

// 스텁 버전은 다음을 돌려줍니다: sessionOptionKeys = [] · initialSessionOptions = 두 키
// 모두 false(일부러 계약과 반대) · sessionOptionLabel = 언제나 "자동 재생" ·
// sessionOptionStateLabel = 언제나 "켜짐" · sessionOptionAccessibilityLabel = "" ·
// toggleSessionOption = options를 그대로 돌려줍니다.

const allKeys: readonly SessionOptionKey[] = ["auto-play-audio", "show-transcript"];

describe("initialSessionOptions", () => {
  it("SO1. 두 키가 전부 true다 — 수용 기준 5·6·7의 「지금 동작 = 기본」(spec §0.3 D-a)", () => {
    expect(initialSessionOptions["auto-play-audio"]).toBe(true);
    expect(initialSessionOptions["show-transcript"]).toBe(true);
  });
});

describe("sessionOptionKeys", () => {
  it("SO2. 길이가 2이고 순서가 [auto-play-audio, show-transcript]다", () => {
    expect(sessionOptionKeys).toHaveLength(2);
    expect(sessionOptionKeys).toEqual(["auto-play-audio", "show-transcript"]);
  });

  it("SO3. 집합이 Object.keys(initialSessionOptions)의 집합과 같다 — tsc가 못 잡는 축(spec §3)", () => {
    const keysSet = new Set(sessionOptionKeys);
    const initialKeysSet = new Set(Object.keys(initialSessionOptions));

    expect(keysSet).toEqual(initialKeysSet);
  });
});

describe("sessionOptionLabel", () => {
  it("SO4. auto-play-audio → 자동 재생, show-transcript → 대본 표시", () => {
    expect(sessionOptionLabel("auto-play-audio")).toBe("자동 재생");
    expect(sessionOptionLabel("show-transcript")).toBe("대본 표시");
  });

  it("SO5. 라벨 둘이 서로 다르다 — 같으면 SO4가 반쯤 공허해진다", () => {
    const labels = allKeys.map((key) => sessionOptionLabel(key));

    expect(new Set(labels).size).toBe(2);
  });
});

describe("sessionOptionStateLabel", () => {
  it("SO6. true → 켜짐, false → 꺼짐", () => {
    expect(sessionOptionStateLabel(true)).toBe("켜짐");
    expect(sessionOptionStateLabel(false)).toBe("꺼짐");
  });
});

describe("sessionOptionAccessibilityLabel", () => {
  it("SO7. 네 조합 = `${sessionOptionLabel(key)}, ${sessionOptionStateLabel(value)}`", () => {
    for (const key of allKeys) {
      for (const value of [true, false]) {
        expect(sessionOptionAccessibilityLabel(key, value)).toBe(
          `${sessionOptionLabel(key)}, ${sessionOptionStateLabel(value)}`,
        );
      }
    }
  });
});

describe("toggleSessionOption", () => {
  it("SO8. initialSessionOptions에서 그 키만 반전하고 나머지 키는 그대로다 — 두 키 각각", () => {
    const toggledAutoPlay = toggleSessionOption(initialSessionOptions, "auto-play-audio");

    expect(toggledAutoPlay["auto-play-audio"]).toBe(!initialSessionOptions["auto-play-audio"]);
    expect(toggledAutoPlay["show-transcript"]).toBe(initialSessionOptions["show-transcript"]);

    const toggledTranscript = toggleSessionOption(initialSessionOptions, "show-transcript");

    expect(toggledTranscript["show-transcript"]).toBe(!initialSessionOptions["show-transcript"]);
    expect(toggledTranscript["auto-play-audio"]).toBe(initialSessionOptions["auto-play-audio"]);
  });

  it("SO9. 부수효과 없음 — 입력 객체가 안 바뀌고 반환이 새 객체다", () => {
    const before = { ...initialSessionOptions };

    const next = toggleSessionOption(initialSessionOptions, "auto-play-audio");

    expect(initialSessionOptions).toEqual(before);
    expect(next).not.toBe(initialSessionOptions);
  });

  // 항등이라 두 번 반전하면 원래 값으로 돌아옵니다 — 아무 값이나 그대로 돌려주는
  // 스텁도 이 케이스를 공허하게 통과시킵니다.
  it("SO10. (가드) 같은 키로 두 번 토글하면 원래 값이다", () => {
    const once = toggleSessionOption(initialSessionOptions, "auto-play-audio");
    const twice = toggleSessionOption(once, "auto-play-audio");

    expect(twice).toEqual(initialSessionOptions);
  });
});
