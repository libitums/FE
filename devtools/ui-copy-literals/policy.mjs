// 한글 리터럴 허용 정책입니다. 허용 규칙의 데이터와 판정 함수만 둡니다(순수).

export const uiCopyLiteralPolicy = {
  allowedPathPatterns: [
    /\.test\.tsx?$/,
    /\.test-support\.ts$/,
    /^apps\/mobile\/src\/app\/test-helpers\//,
    /^apps\/mobile\/src\/playground\//,
    /^apps\/mobile\/src\/screens\/speech-probe\//,
    /^apps\/mobile\/src\/screens\/handwriting-probe\//,
  ],
  // `파일#최상위 선언` — 학습 콘텐츠 선언 단위 허용 목록입니다.
  learningContentDeclarations: [
    "listening-questions.ts#listeningQuestionsByStep",
    "word-choice-questions.ts#wordChoiceQuestionsByStep",
    "sentence-order-questions.ts#sentenceOrderQuestionsByStep",
    "speaking.ts#speakingQuestionsByStep",
    "writing.ts#writingQuestionsByStep",
    "episode-final-tests.ts#episodeFinalTests",
    "episode-narrative.ts#placeholderNarrative",
    "tutorial-prologue.ts#tutorialPrologue",
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
    // 메신저의 한글 자판 — 조합에 쓰는 자모 표입니다(학습자가 한국어를 입력하는 도구).
    "hangul-keyboard.ts#initials",
    "hangul-keyboard.ts#medials",
    "hangul-keyboard.ts#finals",
    "hangul-keyboard.ts#compoundMedials",
    "hangul-keyboard.ts#compoundFinals",
    "hangul-keyboard.ts#shiftedKeys",
    "hangul-keyboard.ts#hangulKeyRows",
  ],
  // 아직 옮기지 않은 파일 — 줄어들기만 합니다(위반이 0이 되면 `check.mjs`가 지우라고 실패합니다).
  // `node devtools/ui-copy-literals/check.mjs --print-pending`이 지금 남은 파일을 찍습니다.
  pendingMigration: [],
};

/** 「」 밖에 한글이 남으면 `true`. 닫히지 않은 「는 밖으로 봅니다. */
export function hangulOutsideCornerQuotes(text) {
  const outside = text.replace(/「[^」]*」/gu, "");
  return /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7A3]/u.test(outside);
}

/**
 * @param {{ line: number, text: string, declaration: string, inErrorConstructor: boolean }[]} literals
 * @param {string} fileName 저장소 루트 기준 경로
 * @param {typeof uiCopyLiteralPolicy} policy
 * @returns {{ line: number, text: string, message: string }[]}
 */
export function violationsFrom(literals, fileName, policy) {
  if (policy.allowedPathPatterns.some((pattern) => pattern.test(fileName))) {
    return [];
  }
  const baseName = fileName.slice(fileName.lastIndexOf("/") + 1);
  const learning = new Set(policy.learningContentDeclarations);

  const candidates = literals.filter(
    (literal) =>
      !literal.inErrorConstructor &&
      hangulOutsideCornerQuotes(literal.text) &&
      !learning.has(`${baseName}#${literal.declaration}`),
  );

  if (policy.pendingMigration.includes(fileName)) {
    if (candidates.length === 0) {
      return [
        {
          line: 1,
          text: "",
          message: "한글 UI 리터럴이 없습니다. 전환 목록에서 지우세요.",
        },
      ];
    }
    return [];
  }

  return candidates.map((literal) => ({
    line: literal.line,
    text: literal.text,
    message: `${literal.declaration || "(최상위)"}: 한글 UI 리터럴 — 문구표(useUiCopy)로 옮기세요.`,
  }));
}
