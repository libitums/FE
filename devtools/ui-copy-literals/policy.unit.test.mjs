import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { hangulOutsideCornerQuotes, uiCopyLiteralPolicy, violationsFrom } from "./policy.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

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
test("PO4. 학습 콘텐츠 선언 표가 허용한 13항목과 같다 — 지운 튜토리얼 대본 · 문항 선언이 없다", () => {
  const expected = [
    "OnboardingQuizCards.tsx#quizSyllables",
    "OnboardingStoryCards.tsx#onboardingStoryMessages",
    "hangul-keyboard.ts#initials",
    "hangul-keyboard.ts#medials",
    "hangul-keyboard.ts#finals",
    "hangul-keyboard.ts#compoundMedials",
    "hangul-keyboard.ts#compoundFinals",
    "hangul-keyboard.ts#shiftedKeys",
    "hangul-keyboard.ts#hangulKeyRows",
    "placeholder-fill.ts#DEFAULT_PROFILE_TEXT",
    "placeholder-fill.ts#PLACEHOLDER_TOKENS",
    "placeholder-fill.ts#PARTICLE_RULES",
    "catalog-cover.ts#CATALOG_SELF_SPEAKER",
  ];

  assert.equal(expected.length, 13);
  assert.deepEqual(
    [...uiCopyLiteralPolicy.learningContentDeclarations].sort(),
    [...expected].sort(),
  );
});

// DP1 — 목록의 파일은 모두 소스 트리에 있어야 한다(지운 파일이 목록에 남지 않게).
test("DP1. 학습 콘텐츠 선언 표의 파일이 모두 apps/mobile/src 안에 있다", () => {
  const sourceRoot = path.join(repoRoot, "apps", "mobile", "src");
  const files = new Set();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(path.join(dir, entry.name));
      else files.add(entry.name);
    }
  };
  walk(sourceRoot);

  for (const declaration of uiCopyLiteralPolicy.learningContentDeclarations) {
    const fileName = declaration.slice(0, declaration.indexOf("#"));
    assert.ok(files.has(fileName), `${declaration}: ${fileName} 파일이 없다`);
  }
});
