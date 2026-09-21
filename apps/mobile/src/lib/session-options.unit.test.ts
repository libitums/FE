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

// 계약: .agent-harness/work/lib-259/spec.md §2.1(순수 모듈 계약) · §0.3 D-a.
// 계획: .agent-harness/work/lib-259/test-plan.md unit § `lib/session-options.unit.test.ts`.
//
// 스텁 기준(test-plan.md): sessionOptionKeys = [] · initialSessionOptions = 두 키
// 모두 false(일부러 계약과 반대) · sessionOptionLabel = 언제나 "자동 재생" ·
// sessionOptionStateLabel = 언제나 "켜짐" · sessionOptionAccessibilityLabel = "" ·
// toggleSessionOption = options를 그대로 돌려준다.

const allKeys: readonly SessionOptionKey[] = ["auto-play-audio", "show-transcript"];

describe("initialSessionOptions", () => {
  // SO1
  it("SO1. 두 키가 전부 true다 — 수용 기준 5·6·7의 「지금 동작 = 기본」(spec §0.3 D-a)", () => {
    expect(initialSessionOptions["auto-play-audio"]).toBe(true);
    expect(initialSessionOptions["show-transcript"]).toBe(true);
  });
});

describe("sessionOptionKeys", () => {
  // SO2
  it("SO2. 길이가 2이고 순서가 [auto-play-audio, show-transcript]다", () => {
    expect(sessionOptionKeys).toHaveLength(2);
    expect(sessionOptionKeys).toEqual(["auto-play-audio", "show-transcript"]);
  });

  // SO3
  it("SO3. 집합이 Object.keys(initialSessionOptions)의 집합과 같다 — tsc가 못 잡는 축(spec §3)", () => {
    const keysSet = new Set(sessionOptionKeys);
    const initialKeysSet = new Set(Object.keys(initialSessionOptions));

    expect(keysSet).toEqual(initialKeysSet);
  });
});

describe("sessionOptionLabel", () => {
  // SO4
  it("SO4. auto-play-audio → 자동 재생, show-transcript → 대본 표시", () => {
    expect(sessionOptionLabel("auto-play-audio")).toBe("자동 재생");
    expect(sessionOptionLabel("show-transcript")).toBe("대본 표시");
  });

  // SO5
  it("SO5. 라벨 둘이 서로 다르다 — 같으면 SO4가 반쯤 공허해진다", () => {
    const labels = allKeys.map((key) => sessionOptionLabel(key));

    expect(new Set(labels).size).toBe(2);
  });
});

describe("sessionOptionStateLabel", () => {
  // SO6
  it("SO6. true → 켜짐, false → 꺼짐", () => {
    expect(sessionOptionStateLabel(true)).toBe("켜짐");
    expect(sessionOptionStateLabel(false)).toBe("꺼짐");
  });
});

describe("sessionOptionAccessibilityLabel", () => {
  // SO7
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
  // SO8
  it("SO8. initialSessionOptions에서 그 키만 반전하고 나머지 키는 그대로다 — 두 키 각각", () => {
    const toggledAutoPlay = toggleSessionOption(initialSessionOptions, "auto-play-audio");

    expect(toggledAutoPlay["auto-play-audio"]).toBe(!initialSessionOptions["auto-play-audio"]);
    expect(toggledAutoPlay["show-transcript"]).toBe(initialSessionOptions["show-transcript"]);

    const toggledTranscript = toggleSessionOption(initialSessionOptions, "show-transcript");

    expect(toggledTranscript["show-transcript"]).toBe(!initialSessionOptions["show-transcript"]);
    expect(toggledTranscript["auto-play-audio"]).toBe(initialSessionOptions["auto-play-audio"]);
  });

  // SO9
  it("SO9. 부수효과 없음 — 입력 객체가 안 바뀌고 반환이 새 객체다", () => {
    const before = { ...initialSessionOptions };

    const next = toggleSessionOption(initialSessionOptions, "auto-play-audio");

    expect(initialSessionOptions).toEqual(before);
    expect(next).not.toBe(initialSessionOptions);
  });

  // SO10 (가드) — 스텁에서도 통과한다(항등이라 두 번 반전하면 원래 값으로 돌아온다).
  it("SO10. (가드) 같은 키로 두 번 토글하면 원래 값이다", () => {
    const once = toggleSessionOption(initialSessionOptions, "auto-play-audio");
    const twice = toggleSessionOption(once, "auto-play-audio");

    expect(twice).toEqual(initialSessionOptions);
  });
});
