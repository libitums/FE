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

test("UC-C1. 카탈로그 맵 · 표지 문구가 문구표 값과 같다", () => {
  expect(c.catalogMap.episodeLabel(4)).toBe("Episode 4.");
  expect(c.catalogMap.coverTitle).toBe("Episode intro");
  expect(c.catalogMap.lessonTitle(2)).toBe("Lesson 2");
  expect(c.catalogMap.finalTitle).toBe("Final test");
  expect(c.catalogMap.caption).toEqual({
    pending: "COMING SOON",
    update: "UPDATE REQUIRED",
    unavailable: "NOT AVAILABLE",
  });
  expect(c.catalogMap.unavailableSection("Episode 4.", "Ep", "pending")).toBe(
    "Episode 4. Ep, coming soon",
  );
  expect(c.catalogMap.unavailableSection("Episode 4.", "Ep", "update")).toBe(
    "Episode 4. Ep, update the app to open",
  );
  expect(c.catalogMap.unavailableSection("Episode 4.", "Ep", "unavailable")).toBe(
    "Episode 4. Ep, not available",
  );
  expect(c.catalogCover.toggleScript).toEqual({
    en: "Show romanization",
    roman: "Show English",
  });
  expect(c.catalogCover.nextCut(2, 6)).toBe("Next scene, 2 of 6");
  expect(c.catalogCover.finishCover).toBe("Finish intro");
});

test("UC-L1. 카탈로그 학습 문구가 문구표 값과 같고 준비 중 문구는 없다", () => {
  expect(c.catalogMap.nodeLabel("Episode 1.", "Lesson 1")).toBe("Episode 1. Lesson 1");
  expect("preparing" in c.catalogMap).toBe(false);
  expect(c.catalogCover.finishEpilogue).toBe("Finish episode");
  expect(c.typing.instruction).toBe("Type the sentence in Korean.");
  expect(c.typing.answerField("여권")).toBe("Your answer: 여권");
  expect(c.typing.answerFieldEmpty).toBe("Your answer, empty");
  expect(c.typing.answerReveal("여권")).toBe("Answer: 여권");
  expect(c.catalogFinal.turnProgress(2, 3)).toBe("Turn 2 of 3");
  expect(c.catalogFinal.replyLabel("네")).toBe("Your reply: 네");
  expect(c.catalogFinal.replyEmpty).toBe("Your reply, empty");
  expect(c.catalogFinal.replyHint("No")).toBe("Say: No");
  expect(c.catalogFinal.correctAnswer("네")).toBe("Answer: 네");
  expect(c.audioUnavailable.label).toBe("Audio not available yet");
});

test("UC-I1. 단어 카드 · 짝 맞추기 · 그림 제시 문구가 문구표 값과 같다", () => {
  expect(c.vocabCard.instruction).toBe("Learn this word.");
  expect(c.vocabCard.badge).toBe("New word");
  expect(c.vocabCard.exampleTitle).toBe("Example");
  expect(c.vocabCard.pronunciation("mul")).toBe("Pronunciation: mul");
  expect(c.vocabCard.meaning("water")).toBe("Meaning: water");
  expect(c.vocabCard.example("x")).toBe("Example: x");
  expect(c.pairMatch.instruction).toBe("Tap a word, then its meaning.");
  expect(c.pairMatch.progress(1, 4)).toBe("1 / 4 matched");
  expect(c.pairMatch.progressLabel(1, 4)).toBe("1 of 4 pairs matched");
  expect(c.pairMatch.selected("a")).toBe("a, selected");
  expect(c.pairMatch.matched("a", 2, "b")).toBe("a, pair 2, matched with b");
  expect(c.pairMatch.judged("a", "b")).toBe("a, matched with b");
  expect(c.pairMatch.answerPair("a", "b")).toBe("a = b");
  expect(c.pairMatch.linked("a", "b", 1, 4)).toBe("Matched: a, b. 1 of 4.");
  expect(c.pairMatch.unlinked("a")).toBe("Unmatched: a");
  expect(c.pairMatch.missedPairs("a, b.")).toBe("Correct pairs: a, b.");
  expect(c.pairMatch.spokenPair("a", "b")).toBe("a, b.");
  expect(c.wordChoicePicture.picture("water")).toBe("Picture: water");
  expect(c.wordChoicePicture.loading).toBe("Picture, loading");
  expect(c.wordChoicePicture.unavailable("water")).toBe("Picture unavailable. Meaning: water");
  expect(c.wordChoicePicture.unavailableCaption).toBe("Picture unavailable");
  expect(c.wordChoicePicture.answer("x", "y", "water")).toBe("Answer: x, y, water");
  expect(c.wordChoicePicture.answer("x", null, "water")).toBe("Answer: x, water");
  expect(c.wordChoicePicture.answerSubline("mul", "water")).toBe("mul · water");
  expect(c.wordChoicePicture.answerSubline(null, "water")).toBe("water");
});

test("UC-L. 학습자 프로필 구획의 모든 잎이 비지 않은 문자열이고 함수는 문자열을 낸다", () => {
  const leaves = leavesOf(c.learnerProfile, "learnerProfile");

  const emptyPaths = leaves
    .filter((leaf) => {
      const out =
        typeof leaf.value === "string"
          ? leaf.value
          : (leaf.value as (...args: unknown[]) => unknown)(...sampleArgs);
      return typeof out !== "string" || out.trim() === "";
    })
    .map((leaf) => leaf.path);

  expect(leaves.length).toBeGreaterThan(20);
  expect(emptyPaths).toEqual([]);
});

test("UC-L. 학습자 프로필 문구 함수가 인자를 문장에 싣는다", () => {
  const p = c.learnerProfile;

  expect(p.picker.matches(1)).not.toBe(p.picker.matches(2));
  expect(p.picker.matches(3)).toContain("3");
  expect(p.picker.allCountries(199)).toContain("199");
  expect(p.picker.row("France", "프랑스")).toContain("France");
  expect(p.picker.row("France", "프랑스")).toContain("프랑스");
  expect(p.picker.countrySet("France")).toContain("France");
  expect(p.summary.both("Emma", "France")).toContain("Emma");
  expect(p.summary.both("Emma", "France")).toContain("France");
  expect(p.summary.pending("Emma · France")).toContain("Emma · France");
  expect(p.preview.label("yours", "Emma로 예약했어요.", "I booked under Emma.")).toContain(
    "I booked under Emma.",
  );
  expect(p.nameIssue.empty).not.toBe(p.nameIssue["forbidden-character"]);
  expect(p.nameEmptyOnGate).not.toBe(p.nameIssue.empty);
  expect(p.countryMissing).not.toBe(p.nameIssue.empty);
});
