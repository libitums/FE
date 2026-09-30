import { expect, test } from "vitest";

import { uiCopyEn } from "./ui-copy-en";

type Leaf = { readonly path: string; readonly value: string | ((...args: never[]) => unknown) };

function leavesOf(node: unknown, path = ""): Leaf[] {
  if (typeof node === "string" || typeof node === "function") {
    return [{ path, value: node as Leaf["value"] }];
  }
  if (node === null || typeof node !== "object") {
    return [];
  }
  return Object.entries(node).flatMap(([key, child]) =>
    leavesOf(child, path === "" ? key : `${path}.${key}`),
  );
}

const c = uiCopyEn;

// 표본 인자는 영어(ASCII)로 줍니다 — 결과의 한글은 표가 낸 것입니다.
const sampleArgs: readonly unknown[] = [0, 1, 5, "x", true, false];

test("UE1. 복수형 — 젬 · 트로피 · 다이아 · 연속 일수", () => {
  expect(c.common.count.gems(0)).toBe("0 gems");
  expect(c.common.count.gems(1)).toBe("1 gem");
  expect(c.common.count.gems(5)).toBe("5 gems");
  expect(c.common.count.trophies(1)).toBe("1 trophy");
  expect(c.common.count.trophies(3)).toBe("3 trophies");
  expect(c.common.count.diamonds(1)).toBe("1 diamond");
  expect(c.common.count.diamonds(12)).toBe("12 diamonds");
  expect(c.common.count.streakDays(1)).toBe("1-day streak");
  expect(c.common.count.streakDays(3)).toBe("3-day streak");
});

test("UE1. 복수형 — 활동 수 · 에피소드 · 젬 팩 · 잔액", () => {
  expect(c.journeyMap.activityCount(1, 1)).toBe("1/1 activity");
  expect(c.journeyMap.activityCount(1, 4)).toBe("1/4 activities");
  expect(c.journeyMap.activityCount(0, 4)).toBe("0/4 activities");
  // 접근성 이름은 `n of N` — 분수(「one quarter」)로 읽히지 않게(a11y W1).
  expect(c.journeyMap.activityProgressLabel(1, 1)).toBe("1 of 1 activity done");
  expect(c.journeyMap.activityProgressLabel(1, 4)).toBe("1 of 4 activities done");
  expect(c.episodeNarrative.nextLine(1, 3)).toBe("Next line, 1 of 3");
  expect(c.journeyMap.statModal.episodesClearedHero(1)).toBe("1 episode cleared");
  expect(c.gemPurchase.packAmount(1200, "1,200")).toBe("1,200 gems");
  expect(c.gemPurchase.balance(1, "1")).toBe("You have 1 gem");
});

test("UE2. 조건부 문구 — 실수 · 건너뜀", () => {
  expect(c.lessonComplete.mistakes(0)).toBe("no mistakes");
  expect(c.lessonComplete.mistakes(2)).toBe("2 mistakes");
  expect(c.lessonComplete.skippedSuffix(0)).toBe("");
  expect(c.lessonComplete.skippedSuffix(1)).toBe(", 1 skipped question");
  expect(c.lessonComplete.skippedSuffix(3)).toBe(", 3 skipped questions");
});

test("UE2. 조건부 문구 — 쓰기 · 통화 · 결과 낭독", () => {
  expect(c.writing.slotsCurrent(3, 1, "주", "")).toBe("Letter 1 of 3, 주");
  expect(c.writing.slotsCurrent(3, 2, "세", "주")).toBe("Letter 2 of 3, 세, written 주");
  expect(c.writing.slotsAllWritten(3, "주세요")).toBe("3 letters to write, all written, 주세요");
  expect(c.episodeIntro.call.mute(true)).toBe("Mute, on");
  expect(c.common.resultAnnouncement("incorrect")).toBe("Result, incorrect");
  expect(c.assessment.announcement("failed")).toBe("Assessment result, not passed");
  expect(c.episodeFinal.optionSuffix.idle).toBe("");
});

test("UE3. 표 전체(문자열 잎 + 함수 잎)에 한글이 없다", () => {
  const leaves = leavesOf(uiCopyEn);
  expect(leaves.length).toBeGreaterThan(0);
  const hangul = /[가-힣]/;
  for (const leaf of leaves) {
    if (typeof leaf.value === "string") {
      expect(hangul.test(leaf.value), leaf.path).toBe(false);
      continue;
    }
    for (const arg of sampleArgs) {
      const out = (leaf.value as (...a: unknown[]) => unknown)(arg, arg, arg, arg);
      expect(hangul.test(String(out)), `${leaf.path}(${String(arg)})`).toBe(false);
    }
  }
});

test("UE4. 탭 머리 제목이 17자 이하다", () => {
  const limit = 17;
  for (const title of [c.profile.title, c.notifications.title, c.settings.title]) {
    expect(title.length).toBeLessThanOrEqual(limit);
  }
});

test("UE5. 부록 B 대표 문구와 문자열이 같다", () => {
  expect(c.common.exitTo.journey).toBe("Back to map");
  expect(c.learningShell.leaveDialog.title).toBe("Leave this lesson?");
  expect(c.settings.nav["privacy-policy"]).toBe("Privacy Policy");
  expect(c.settings.nav["terms-of-use"]).toBe("Terms of Use");
  expect(c.phoneCall.status.playing).toBe("Speaking…");
  expect(c.roleplay.premiumNotice("T")).toBe("“T” is a Plus roleplay. Plus isn't available yet.");
});
