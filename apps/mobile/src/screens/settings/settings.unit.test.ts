import { describe, expect, it } from "vitest";

import type { SessionOptionKey } from "../../lib/session-options";
import {
  sessionOptionChangedEvent,
  settingsNavLabel,
  settingsNavOpenedEvent,
  settingsNavTargets,
} from "./settings";
import type { SettingsNavTarget } from "./settings.contract";
import { uiCopyEn } from "../../lib/ui-copy-en";

const allNavTargets: readonly SettingsNavTarget[] = ["profile", "privacy-policy", "terms-of-use"];
const allSessionOptionKeys: readonly SessionOptionKey[] = ["auto-play-audio", "show-transcript"];

describe("settingsNavTargets", () => {
  it("SN1. 길이가 4이고 순서가 [profile, notifications, privacy-policy, terms-of-use]다", () => {
    expect(settingsNavTargets).toHaveLength(4);
    expect(settingsNavTargets).toEqual([
      "profile",
      "notifications",
      "privacy-policy",
      "terms-of-use",
    ]);
  });
});

describe("settingsNavLabel", () => {
  it("SN2. profile → User profile, privacy-policy → Privacy Policy, terms-of-use → Terms of Use. 셋이 서로 다르다", () => {
    expect(settingsNavLabel("profile", uiCopyEn)).toBe("User profile");
    expect(settingsNavLabel("privacy-policy", uiCopyEn)).toBe("Privacy Policy");
    expect(settingsNavLabel("terms-of-use", uiCopyEn)).toBe("Terms of Use");

    const labels = allNavTargets.map((target) => settingsNavLabel(target, uiCopyEn));
    expect(new Set(labels).size).toBe(3);
  });
});

describe("settingsNavOpenedEvent", () => {
  it("SN3. profile → profile_opened, 문서 둘 → legal_document_opened(document, source: settings)", () => {
    expect(settingsNavOpenedEvent("profile")).toEqual({ name: "profile_opened" });
    expect(settingsNavOpenedEvent("privacy-policy")).toEqual({
      name: "legal_document_opened",
      document: "privacy-policy",
      source: "settings",
    });
    expect(settingsNavOpenedEvent("terms-of-use")).toEqual({
      name: "legal_document_opened",
      document: "terms-of-use",
      source: "settings",
    });
  });
});

describe("sessionOptionChangedEvent", () => {
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

  it("SN6. (가드) payload 키가 정확히 name·option·value 셋이다 — PII 없음", () => {
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

// SN7 (가드) — settingsNavLabel·settingsNavOpenedEvent·sessionOptionChangedEvent 세
// 함수와 settingsNavTargets 값 전부가 「네 함수」에 들어갑니다.
describe("입력 불변 · 부수효과 없음 (가드)", () => {
  it("SN7. (가드) 네 함수 전부 같은 입력에 같은 값이고 입력을 바꾸지 않는다", () => {
    expect(settingsNavTargets).toEqual(settingsNavTargets);

    for (const target of allNavTargets) {
      expect(settingsNavLabel(target, uiCopyEn)).toBe(settingsNavLabel(target, uiCopyEn));
      expect(settingsNavOpenedEvent(target)).toEqual(settingsNavOpenedEvent(target));
    }

    for (const key of allSessionOptionKeys) {
      const before = key;
      expect(sessionOptionChangedEvent(key, true)).toEqual(sessionOptionChangedEvent(key, true));
      expect(key).toBe(before);
    }
  });
});
