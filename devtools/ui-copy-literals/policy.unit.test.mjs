import assert from "node:assert/strict";
import test from "node:test";

import { hangulOutsideCornerQuotes, uiCopyLiteralPolicy, violationsFrom } from "./policy.mjs";

const literal = (overrides = {}) => ({
  line: 3,
  text: "다음",
  declaration: "table",
  inErrorConstructor: false,
  ...overrides,
});

const uiFile = "apps/mobile/src/app/AppHeader.tsx";

// PO1 — 「」 밖의 한글만 위반 후보입니다.
test("PO1. 한글이 전부 「」 안이면 false다", () => {
  assert.equal(hangulOutsideCornerQuotes("「안녕하세요」 works"), false);
});

test("PO1. 「」 밖에 한글이 있으면 true다", () => {
  assert.equal(hangulOutsideCornerQuotes("Say 「저기요」, 네"), true);
});

test("PO1. 닫히지 않은 「는 밖으로 본다", () => {
  assert.equal(hangulOutsideCornerQuotes("「미완"), true);
});

test("PO1. 한글이 없으면 false다", () => {
  assert.equal(hangulOutsideCornerQuotes("plain english"), false);
});

// PO2 — 허용 규칙 1~4와, 같은 파일의 다른 선언은 위반이라는 것.
test("PO2. 허용 경로 여섯은 위반 0이다", () => {
  const allowed = [
    "apps/mobile/src/lib/a.test.ts",
    "apps/mobile/src/screens/B.test.tsx",
    "apps/mobile/src/lib/ui-copy.test-support.ts",
    "apps/mobile/src/app/test-helpers/signed-in-app.ts",
    "apps/mobile/src/playground/Demo.tsx",
    "apps/mobile/src/screens/speech-probe/Probe.tsx",
    "apps/mobile/src/screens/handwriting-probe/Probe.tsx",
  ];
  for (const fileName of allowed) {
    assert.deepEqual(violationsFrom([literal()], fileName, uiCopyLiteralPolicy), [], fileName);
  }
});

test("PO2. 허용 경로 밖 파일의 한글은 위반이고 줄과 문구를 싣는다", () => {
  const violations = violationsFrom([literal({ line: 7 })], uiFile, uiCopyLiteralPolicy);

  assert.equal(violations.length, 1);
  assert.equal(violations[0].line, 7);
  assert.equal(violations[0].text, "다음");
  assert.equal(typeof violations[0].message, "string");
});

test("PO2. new Error 안의 한글은 위반이 아니다", () => {
  const found = violationsFrom(
    [literal({ inErrorConstructor: true })],
    uiFile,
    uiCopyLiteralPolicy,
  );

  assert.deepEqual(found, []);
});

test("PO2. 한글이 전부 「」 안인 리터럴은 위반이 아니다", () => {
  const found = violationsFrom(
    [literal({ text: "「안녕하세요」 works" })],
    uiFile,
    uiCopyLiteralPolicy,
  );

  assert.deepEqual(found, []);
});

test("PO2. 학습 콘텐츠 선언 표의 파일#선언은 위반이 아니다", () => {
  const found = violationsFrom(
    [literal({ declaration: "listeningQuestionsByStep" })],
    "apps/mobile/src/screens/listening/listening-questions.ts",
    uiCopyLiteralPolicy,
  );

  assert.deepEqual(found, []);
});

test("PO2. 같은 파일의 다른 선언은 위반이다", () => {
  const found = violationsFrom(
    [
      literal({ declaration: "listeningQuestionsByStep" }),
      literal({ line: 40, declaration: "somethingElse" }),
    ],
    "apps/mobile/src/screens/listening/listening-questions.ts",
    uiCopyLiteralPolicy,
  );

  assert.equal(found.length, 1);
  assert.equal(found[0].line, 40);
});

// PO3 — 전환 목록(규칙 5): 위반 있음 통과 · 위반 0이면 실패 · 목록 밖은 위반.
const pendingFile = "apps/mobile/src/app/Pending.tsx";
const withPending = { ...uiCopyLiteralPolicy, pendingMigration: [pendingFile] };

test("PO3. 전환 목록의 파일에 위반이 있으면 통과한다", () => {
  assert.deepEqual(violationsFrom([literal()], pendingFile, withPending), []);
});

test("PO3. 전환 목록의 파일에 위반이 0이면 「전환 목록에서 지우세요」 1건이다", () => {
  const found = violationsFrom([], pendingFile, withPending);

  assert.equal(found.length, 1);
  assert.ok(found[0].message.includes("전환 목록에서 지우세요"));
});

test("PO3. 전환 목록에 없는 파일의 위반은 위반이다", () => {
  const found = violationsFrom([literal()], uiFile, withPending);

  assert.equal(found.length, 1);
});

test("PO3. 전환 목록에 없는 깨끗한 파일은 위반 0이다", () => {
  assert.deepEqual(violationsFrom([], uiFile, withPending), []);
});

// 학습 콘텐츠와 자모 표에 튜토리얼 혼합 대본 선언을 더합니다. 파일 전체를 허용하지 않습니다.
test("PO4. 학습 콘텐츠 선언 표가 허용한 27항목과 같다", () => {
  const expected = [
    "listening-questions.ts#listeningQuestionsByStep",
    "word-choice-questions.ts#wordChoiceQuestionsByStep",
    "sentence-order-questions.ts#sentenceOrderQuestionsByStep",
    "speaking.ts#speakingQuestionsByStep",
    "writing.ts#writingQuestionsByStep",
    "episode-final-tests.ts#episodeFinalTests",
    "episode-narrative.ts#placeholderNarrative",
    "tutorial-prologue.ts#tutorialPrologue",
    "tutorial-final-story.ts#tutorialFinalStory",
    "messenger.ts#conversations",
    "phone-call.ts#conversation",
    "phone-call.contract.ts#ConfirmTimePhoneCallTurn",
    "phone-call.contract.ts#ConfirmPlacePhoneCallTurn",
    "phone-call.contract.ts#GoodbyePhoneCallTurn",
    "visual-novel.ts#visualNovelStoryFor",
    "visual-novel.contract.ts#ArriveVisualNovelBeat",
    "visual-novel.contract.ts#FindVisualNovelBeat",
    "visual-novel.contract.ts#EnterVisualNovelBeat",
    "OnboardingQuizCards.tsx#quizSyllables",
    "OnboardingStoryCards.tsx#onboardingStoryMessages",
    "hangul-keyboard.ts#initials",
    "hangul-keyboard.ts#medials",
    "hangul-keyboard.ts#finals",
    "hangul-keyboard.ts#compoundMedials",
    "hangul-keyboard.ts#compoundFinals",
    "hangul-keyboard.ts#shiftedKeys",
    "hangul-keyboard.ts#hangulKeyRows",
  ];

  assert.equal(expected.length, 27);
  assert.deepEqual(
    [...uiCopyLiteralPolicy.learningContentDeclarations].sort(),
    [...expected].sort(),
  );
});
