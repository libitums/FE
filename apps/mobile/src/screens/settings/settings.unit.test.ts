import { describe, expect, it } from "vitest";

import { initialSessionOptions, type SessionOptionKey } from "../../lib/session-options";
import {
  sessionOptionChangedEvent,
  settingsAccountStateOf,
  settingsNavLabel,
  settingsNavOpenedEvent,
  settingsNavTargets,
  settingsSessionOptionKeys,
  settingsSessionOptionRows,
  settingsNavTargetsFor,
} from "./settings";
import type { SettingsNavTarget } from "./settings.contract";
import { uiCopyEn } from "../../lib/ui-copy-en";

const allNavTargets: readonly SettingsNavTarget[] = ["profile", "privacy-policy", "terms-of-use"];
const allSessionOptionKeys: readonly SessionOptionKey[] = [
  "auto-play-audio",
  "show-transcript",
  "show-choice-romanization",
];

describe("settingsNavTargets", () => {
  it("SN1. 길이가 8이고 순서가 [profile, learner-profile, language, download, notifications, feedback, privacy-policy, terms-of-use]다", () => {
    expect(settingsNavTargets).toHaveLength(8);
    expect(settingsNavTargets).toEqual([
      "profile",
      "learner-profile",
      "language",
      "download",
      "notifications",
      "feedback",
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
    expect(settingsNavOpenedEvent("learner-profile")).toEqual({ name: "learner_profile_opened" });
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

describe("settingsSessionOptionRows", () => {
  it("SN8. 설정에 오르는 세션 옵션 키는 show-choice-romanization 하나다", () => {
    expect(settingsSessionOptionKeys).toEqual(["show-choice-romanization"]);
  });

  it("SN8. 행은 { key, title, description, checked }이고 초기값에서 checked: true다", () => {
    expect(settingsSessionOptionRows(initialSessionOptions, uiCopyEn)).toEqual([
      {
        key: "show-choice-romanization",
        title: "Romanization on choices",
        description: "Show how each Korean answer is read, in small text above it.",
        checked: true,
      },
    ]);
  });

  it("SN8. 옵션이 꺼져 있으면 checked: false다 — 다른 키 값은 행에 영향이 없다", () => {
    const off = { ...initialSessionOptions, "show-choice-romanization": false };

    const rows = settingsSessionOptionRows(off, uiCopyEn);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.checked).toBe(false);
    expect(
      settingsSessionOptionRows(
        { ...off, "auto-play-audio": false, "show-transcript": true },
        uiCopyEn,
      ),
    ).toEqual(rows);
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

  it("SN9. show-choice-romanization 끔 · 켬이 { name, option, value }와 toEqual이다", () => {
    expect(sessionOptionChangedEvent("show-choice-romanization", false)).toEqual({
      name: "session_option_changed",
      option: "show-choice-romanization",
      value: false,
    });
    expect(sessionOptionChangedEvent("show-choice-romanization", true)).toEqual({
      name: "session_option_changed",
      option: "show-choice-romanization",
      value: true,
    });
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

describe("settingsNavTargetsFor · settingsAccountStateOf", () => {
  it("SN7. signed-in은 여덟 그대로, guest는 notifications · feedback을 뺀 여섯(순서 유지)이다", () => {
    expect(settingsNavTargetsFor("signed-in")).toEqual(settingsNavTargets);
    expect(settingsNavTargetsFor("guest")).toEqual([
      "profile",
      "learner-profile",
      "language",
      "download",
      "privacy-policy",
      "terms-of-use",
    ]);
  });

  it("SN7. 계정 상태는 guest만 guest이고 signed-in · signed-out은 signed-in으로 본다", () => {
    expect(settingsAccountStateOf("guest")).toBe("guest");
    expect(settingsAccountStateOf("signed-in")).toBe("signed-in");
    expect(settingsAccountStateOf("signed-out")).toBe("signed-in");
  });
});
