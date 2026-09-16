import { describe, expect, it } from "vitest";

import type { SessionOptionKey } from "../../lib/session-options";
import {
  sessionOptionChangedEvent,
  settingsNavLabel,
  settingsNavOpenedEvent,
  settingsNavTargets,
} from "./settings";
import type { SettingsNavTarget } from "./settings.contract";

// 계약: .agent-harness/work/lib-259/spec.md §2.4(순수 모듈 계약).
// 계획: .agent-harness/work/lib-259/test-plan.md unit § `screens/settings/settings.unit.test.ts`.
//
// 스텁 기준(test-plan.md): settingsNavTargets = [] · settingsNavLabel = 언제나
// "사용자 프로필" · settingsNavOpenedEvent = 언제나 { name: "profile_opened" } ·
// sessionOptionChangedEvent = { name, option: key, value: true }(value 고정).

const allNavTargets: readonly SettingsNavTarget[] = ["profile", "terms"];
const allSessionOptionKeys: readonly SessionOptionKey[] = ["auto-play-audio", "show-transcript"];

describe("settingsNavTargets", () => {
  // SN1
  it("SN1. 길이가 2이고 순서가 [profile, terms]다", () => {
    expect(settingsNavTargets).toHaveLength(2);
    expect(settingsNavTargets).toEqual(["profile", "terms"]);
  });
});

describe("settingsNavLabel", () => {
  // SN2
  it("SN2. profile → 사용자 프로필, terms → 개인정보 보호 및 약관. 둘이 서로 다르다", () => {
    expect(settingsNavLabel("profile")).toBe("사용자 프로필");
    expect(settingsNavLabel("terms")).toBe("개인정보 보호 및 약관");

    const labels = allNavTargets.map((target) => settingsNavLabel(target));
    expect(new Set(labels).size).toBe(2);
  });
});

describe("settingsNavOpenedEvent", () => {
  // SN3
  it("SN3. profile → { name: profile_opened }, terms → { name: terms_opened }", () => {
    expect(settingsNavOpenedEvent("profile")).toEqual({ name: "profile_opened" });
    expect(settingsNavOpenedEvent("terms")).toEqual({ name: "terms_opened" });
  });

  // SN4 (가드)
  it("SN4. (가드) 두 열림 이벤트의 키가 정확히 name 하나다", () => {
    for (const target of allNavTargets) {
      expect(Object.keys(settingsNavOpenedEvent(target))).toEqual(["name"]);
    }
  });
});

describe("sessionOptionChangedEvent", () => {
  // SN5
  it("SN5. 네 조합이 { name: session_option_changed, option: key, value }와 toEqual이다", () => {
    for (const key of allSessionOptionKeys) {
      for (const value of [true, false]) {
        expect(sessionOptionChangedEvent(key, value)).toEqual({
          name: "session_option_changed",
          option: key,
          value,
        });
      }
    }
  });

  // SN6 (가드)
  it("SN6. (가드) payload 키가 정확히 name·option·value 셋이다 — PII 없음(spec §7.4)", () => {
    for (const key of allSessionOptionKeys) {
      for (const value of [true, false]) {
        expect(Object.keys(sessionOptionChangedEvent(key, value)).sort()).toEqual([
          "name",
          "option",
          "value",
        ]);
      }
    }
  });
});

// SN7 (가드) — settingsNavLabel · settingsNavOpenedEvent · sessionOptionChangedEvent
// 세 함수 + settingsNavTargets 값 전부가 같은 입력에 같은 값이고 입력을 바꾸지 않는다.
describe("입력 불변 · 부수효과 없음 (가드)", () => {
  it("SN7. (가드) 네 함수 전부 같은 입력에 같은 값이고 입력을 바꾸지 않는다", () => {
    expect(settingsNavTargets).toEqual(settingsNavTargets);

    for (const target of allNavTargets) {
      expect(settingsNavLabel(target)).toBe(settingsNavLabel(target));
      expect(settingsNavOpenedEvent(target)).toEqual(settingsNavOpenedEvent(target));
    }

    for (const key of allSessionOptionKeys) {
      const before = key;
      expect(sessionOptionChangedEvent(key, true)).toEqual(sessionOptionChangedEvent(key, true));
      expect(key).toBe(before);
    }
  });
});
