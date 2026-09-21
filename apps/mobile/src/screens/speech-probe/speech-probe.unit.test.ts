import { expect, test } from "vitest";

import {
  normalizeSpeechText,
  speechComparisons,
  speechNormalizationId,
  speechNormalizationLabel,
  speechNormalizations,
  speechTextShape,
  type SpeechComparison,
  type SpeechNormalization,
} from "./speech-probe";

// 형태의 정본: ./handwriting-probe.unit.test.ts (같은 성격의 탐침) ·
// ../../lib/answer-result.unit.test.ts (주석 밀도와 단언 스타일).
//
// **이 파일이 지지 않는 것: 판정.** 「이 정도면 맞게 읽은 것이다」를 단언하는 케이스가
// 여기 없다. 규칙을 아직 정하지 않았기 때문이고(모듈 상단 주석), 테스트가 먼저 규칙을
// 박으면 구현이 그것을 따라가서 탐침이 관찰하려던 것이 사라진다. 여기서 보는 것은
// 「후보를 적용하면 문자열이 어떻게 되는가」와 「그때 두 줄이 붙는가」까지다.
//
// 케이스의 문자열은 한국어 발화에서 실제로 갈리는 자리를 고른 것이다 — 문장부호를
// 주는지, 띄어쓰기를 어떻게 끊는지, 아무것도 못 알아들었는지.

const keepKeep: SpeechNormalization = { spacing: "keep", punctuation: "keep" };
const collapseRemove: SpeechNormalization = { spacing: "collapse", punctuation: "remove" };
const punctuationOnly: SpeechNormalization = { spacing: "keep", punctuation: "remove" };

function comparisonById(comparisons: readonly SpeechComparison[], id: string): SpeechComparison {
  const found = comparisons.find((comparison) => comparison.id === id);

  // 못 찾으면 여기서 멈춘다 — `undefined`에 건 단언은 그 다음 줄에서 알아보기 어려운
  // 메시지로 터진다.
  if (found === undefined) {
    throw new Error(`후보 행이 없다: ${id}`);
  }

  return found;
}

// ---------------------------------------------------------------- 후보 목록

// N1 — 목록을 배열째로 대조한다. 개수만 세면 어느 조합이 빠졌는지 러너가 말하지 못한다.
test("후보 목록은 두 축의 조합을 빠짐없이 담고 순서가 고정이다", () => {
  expect(speechNormalizations.map((normalization) => speechNormalizationId(normalization))).toEqual(
    [
      "spacing-keep-punctuation-keep",
      "spacing-trim-punctuation-keep",
      "spacing-collapse-punctuation-keep",
      "spacing-remove-punctuation-keep",
      "spacing-keep-punctuation-remove",
      "spacing-trim-punctuation-remove",
      "spacing-collapse-punctuation-remove",
      "spacing-remove-punctuation-remove",
    ],
  );
});

// N2 — id는 화면의 행 키이자 `data-testid`라 겹치면 안 된다.
test("후보의 id는 서로 다르다", () => {
  const ids = speechNormalizations.map((normalization) => speechNormalizationId(normalization));

  expect(new Set(ids).size).toBe(ids.length);
});

// N3 — 라벨은 두 축의 낱말을 가운뎃점 양옆 공백으로 잇는다.
test("라벨은 문장부호 축과 공백 축의 낱말을 잇는다", () => {
  expect(speechNormalizationLabel(keepKeep)).toBe("문장부호 그대로 · 공백 그대로");
  expect(speechNormalizationLabel(collapseRemove)).toBe("문장부호 제거 · 연속 공백 하나로");
});

// ---------------------------------------------------------------- 정규화

// NS1
test("공백과 문장부호를 둘 다 그대로 두면 준 문자열이 그대로 나온다", () => {
  expect(normalizeSpeechText("  안녕하세요, 반가워요.  ", keepKeep)).toBe(
    "  안녕하세요, 반가워요.  ",
  );
});

// NS2 — 양끝만 건드린다. 안쪽의 연속 공백은 이 칸의 것이 아니다.
test("trim은 양끝 공백만 지우고 안쪽은 그대로 둔다", () => {
  expect(normalizeSpeechText("  밥을  먹었어요  ", { spacing: "trim", punctuation: "keep" })).toBe(
    "밥을  먹었어요",
  );
});

// NS3 — 사다리라 `trim`을 포함한다.
test("collapse는 양끝을 지우고 연속 공백을 하나로 만든다", () => {
  expect(
    normalizeSpeechText("  밥을   먹었어요  ", { spacing: "collapse", punctuation: "keep" }),
  ).toBe("밥을 먹었어요");
});

// NS4
test("remove는 공백을 전부 지운다", () => {
  expect(
    normalizeSpeechText("  밥을   먹었어요  ", { spacing: "remove", punctuation: "keep" }),
  ).toBe("밥을먹었어요");
});

// NS5 — 문장부호를 낱자 목록으로 세지 않고 유니코드 구두점 범주에 맡긴 결과를 본다.
test("문장부호 제거는 마침표·쉼표·물음표·말줄임표·가운뎃점을 지운다", () => {
  expect(
    normalizeSpeechText("안녕하세요, 밥…먹었어요? 네·아니요.", {
      spacing: "keep",
      punctuation: "remove",
    }),
  ).toBe("안녕하세요 밥먹었어요 네아니요");
});

// NS5b — ⭐ 이 단위가 지키려는 것이 여기 있다. 인식기가 한글 자판 밖의 부호를 실어
// 와도 같은 범주로 잡혀야 한다 — 전각 쉼표·마침표·물음표, CJK 마침표·쉼표, 낫표,
// 반각 가운뎃점. ASCII만 보는 구현이었다면 이 줄이 통째로 남았을 것이다.
test("문장부호 제거는 전각·CJK 부호도 ASCII 부호와 같게 지운다", () => {
  expect(normalizeSpeechText("안녕하세요， 밥 먹었어요？ 네！", punctuationOnly)).toBe(
    "안녕하세요 밥 먹었어요 네",
  );
  expect(normalizeSpeechText("안녕、밥 먹었어요。", punctuationOnly)).toBe("안녕밥 먹었어요");
  expect(normalizeSpeechText("「밥」을 먹었어요｡", punctuationOnly)).toBe("밥을 먹었어요");
  expect(normalizeSpeechText("네･아니요", punctuationOnly)).toBe("네아니요");
});

// NS5c — 따옴표와 줄표류. 받아쓰기가 곧잘 실어 오는 모양이고, 곧은 따옴표가 아니라
// 굽은 따옴표라 낱자 목록을 적었다면 가장 먼저 새어 나갔을 자리다.
test("문장부호 제거는 굽은 따옴표와 줄표류도 지운다", () => {
  expect(normalizeSpeechText("“밥”과 ‘국’", punctuationOnly)).toBe("밥과 국");
  expect(normalizeSpeechText("밥–국—김치〜끝", punctuationOnly)).toBe("밥국김치끝");
});

// NS6 — ⭐ 순서가 결과를 가른다. 공백을 먼저 다뤘다면 쉼표가 빠진 자리에 공백이 둘
// 남아 `collapse`가 그것을 보지 못했을 것이다.
test("문장부호를 먼저 지워서 그 자리에 남은 공백을 collapse가 본다", () => {
  expect(normalizeSpeechText("안녕 , 세상", collapseRemove)).toBe("안녕 세상");
});

// NS7 — ⭐ 빈 문자열은 오류가 아니라 유효한 입력이다. 인식기가 돌았는데 관측이 0건인
// 것이 실기에서 볼 만한 관찰이라, 어느 후보에서도 그대로 빈 문자열로 남는다.
test("빈 문자열은 어느 후보를 지나도 빈 문자열이다", () => {
  for (const normalization of speechNormalizations) {
    expect(normalizeSpeechText("", normalization)).toBe("");
  }
});

// NS8 — 공백만 실려 온 것과 아무것도 안 실려 온 것이 `trim` 아래에서 같아진다.
// 둘을 가르는 것은 `speechTextShape`의 몫이다.
test("공백만 있는 문자열은 trim부터 빈 문자열이 된다", () => {
  expect(normalizeSpeechText("   ", { spacing: "keep", punctuation: "keep" })).toBe("   ");
  expect(normalizeSpeechText("   ", { spacing: "trim", punctuation: "keep" })).toBe("");
});

// ---------------------------------------------------------------- 문자열의 모양

// SH1
test("빈 문자열의 모양은 아무것도 세지 않고 아무 부호도 담지 않는다", () => {
  expect(speechTextShape("")).toEqual({
    length: 0,
    whitespaceCount: 0,
    hasEdgeWhitespace: false,
    hasRepeatedWhitespace: false,
    punctuation: [],
  });
});

// SH2 — ⭐ 탐침이 답하려는 물음이 여기 걸린다: 인식기가 문장부호를 주는가.
// 빈 배열이 「안 줬다」다.
test("문장부호가 없는 문장은 부호 목록이 비어 있다", () => {
  expect(speechTextShape("밥을 먹었어요").punctuation).toEqual([]);
});

// SH3 — 나타난 순서대로, 중복 없이.
test("문장부호는 나타난 순서대로 중복 없이 담긴다", () => {
  expect(speechTextShape("안녕, 밥 먹었어요? 네, 먹었어요.").punctuation).toEqual([",", "?", "."]);
});

// SH3b — ⭐ SH3의 짝. 「인식기가 문장부호를 주는가」를 묻는 자리라 ASCII만 세면
// 전각 부호를 실어 온 인식기를 「부호를 안 주는 인식기」로 잘못 적게 된다.
test("ASCII가 아닌 문장부호도 모양에 잡힌다", () => {
  expect(speechTextShape("안녕， 밥 먹었어요？ 네。").punctuation).toEqual(["，", "？", "。"]);
  expect(speechTextShape("밥…국·김치").punctuation).toEqual(["…", "·"]);
});

// SH4
test("양끝 공백이 있는지 드러난다", () => {
  expect(speechTextShape(" 밥을 먹었어요").hasEdgeWhitespace).toBe(true);
  expect(speechTextShape("밥을 먹었어요 ").hasEdgeWhitespace).toBe(true);
  expect(speechTextShape("밥을 먹었어요").hasEdgeWhitespace).toBe(false);
});

// SH5 — `collapse`가 할 일이 있는지를 이 값이 말한다.
test("연속된 공백이 있는지 드러난다", () => {
  expect(speechTextShape("밥을  먹었어요").hasRepeatedWhitespace).toBe(true);
  expect(speechTextShape("밥을 먹었어요").hasRepeatedWhitespace).toBe(false);
});

// SH6 — 덩이가 아니라 글자로 센다.
test("공백은 덩이가 아니라 글자로 센다", () => {
  expect(speechTextShape(" 밥을   먹었어요 ").whitespaceCount).toBe(5);
});

// ---------------------------------------------------------------- 나란히 보기

const prompt = "안녕하세요, 밥 먹었어요?";

// C1 — 행은 후보 목록을 그대로 따른다. 화면이 고를 자리가 없다.
test("행은 후보마다 하나이고 순서가 후보 목록 그대로다", () => {
  expect(
    speechComparisons(prompt, "안녕하세요 밥 먹었어요").map((comparison) => comparison.id),
  ).toEqual(speechNormalizations.map((normalization) => speechNormalizationId(normalization)));
});

// C2 — 제시문과 인식 결과가 같은 후보를 지난다. 서로 다른 경로로 정규화되면 나란히
// 놓아도 비교가 안 된다.
test("행마다 제시문과 인식 결과가 그 후보로 정규화되어 실린다", () => {
  const recognized = "  안녕하세요 밥   먹었어요  ";
  const comparisons = speechComparisons(prompt, recognized);

  for (const comparison of comparisons) {
    expect(comparison.prompt).toBe(normalizeSpeechText(prompt, comparison.normalization));
    expect(comparison.recognized).toBe(normalizeSpeechText(recognized, comparison.normalization));
  }
});

// C3 — ⭐ 인식기가 문장부호를 안 준 경우. 문장부호를 그대로 둔 후보에서는 두 줄이
// 갈리고, 지운 후보에서는 붙는다. **어느 쪽이 정답인지는 여기서 정하지 않는다.**
test("문장부호만 다른 쌍은 문장부호를 지운 후보에서 붙는다", () => {
  const comparisons = speechComparisons(prompt, "안녕하세요 밥 먹었어요");

  expect(comparisonById(comparisons, "spacing-keep-punctuation-keep").identical).toBe(false);
  expect(comparisonById(comparisons, "spacing-collapse-punctuation-keep").identical).toBe(false);
  expect(comparisonById(comparisons, "spacing-keep-punctuation-remove").identical).toBe(true);
  expect(comparisonById(comparisons, "spacing-collapse-punctuation-remove").identical).toBe(true);
});

// C4 — ⭐ 띄어쓰기만 갈린 경우. 공백을 전부 지운 후보에서만 붙는다.
test("띄어쓰기만 다른 쌍은 공백을 전부 지운 후보에서만 붙는다", () => {
  const comparisons = speechComparisons("밥을 먹었어요", "밥을먹었어요");

  expect(comparisonById(comparisons, "spacing-keep-punctuation-keep").identical).toBe(false);
  expect(comparisonById(comparisons, "spacing-trim-punctuation-keep").identical).toBe(false);
  expect(comparisonById(comparisons, "spacing-collapse-punctuation-keep").identical).toBe(false);
  expect(comparisonById(comparisons, "spacing-remove-punctuation-keep").identical).toBe(true);
  expect(comparisonById(comparisons, "spacing-remove-punctuation-remove").identical).toBe(true);
});

// C5 — ⭐ 인식기가 아무것도 못 알아들은 경우. 빈 문자열이 유효한 입력이라 행은 그대로
// 서고, 제시문이 비어 있지 않으므로 어느 후보에서도 붙지 않는다.
test("인식 결과가 빈 문자열이어도 행은 그대로 서고 어느 후보에서도 붙지 않는다", () => {
  const comparisons = speechComparisons(prompt, "");

  for (const comparison of comparisons) {
    expect(comparison.recognized).toBe("");
    expect(comparison.identical).toBe(false);
  }
});

// C6 — ⭐ 둘 다 빈 문자열이면 참이 된다. **이것이 「맞았다」가 아니다** — 이 값은
// 문자 그대로 같은가일 뿐이고, 그 자리를 무엇으로 가를지는 실기를 보고 정한다.
test("제시문과 인식 결과가 둘 다 비어 있으면 모든 후보에서 문자열이 같다", () => {
  for (const comparison of speechComparisons("", "")) {
    expect(comparison.identical).toBe(true);
  }
});

// C7 — 완전히 같은 문자열은 후보와 무관하게 붙는다.
test("같은 문자열은 모든 후보에서 붙는다", () => {
  for (const comparison of speechComparisons(prompt, prompt)) {
    expect(comparison.identical).toBe(true);
  }
});

// ---------------------------------------------------------------- 범주의 출처

// U1 — ⭐ 이 단위의 핵심 단언이다. 구현은 `/\p{P}/u`를 쓸 수 없어(모듈 주석: 호스트
// 번들의 바이트코드 인코더가 `\p{...}`를 받지 않는다) 같은 범주를 코드포인트 범위로 펴
// 두었는데, 그 범위가 정말 유니코드 구두점 범주인지는 눈으로 확인할 수 없다. 그래서
// **범위를 손으로 센 기대값과 맞추지 않고, 유니코드 표 자체와 맞춘다** — vitest는 Node에서
// 돌아 `\p{P}`를 쓸 수 있다. 여기가 어긋나면 누군가 범위를 줄이거나 늘린 것이다.
//
// 개수를 적지 않는 것은 일부러다. 유니코드 판이 올라 부호가 늘면 개수를 적은 단언은
// 「늘었다」만 말하고 어느 글자인지는 말하지 않는다.
test("문장부호 범주는 BMP 전체에서 유니코드 구두점 범주와 같다", () => {
  const disagreements: string[] = [];

  for (let codePoint = 0; codePoint <= 0xffff; codePoint += 1) {
    const character = String.fromCodePoint(codePoint);
    const removed = normalizeSpeechText(character, punctuationOnly) === "";

    if (removed !== /\p{P}/u.test(character)) {
      disagreements.push(`U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`);
    }
  }

  expect(disagreements).toEqual([]);
});

// U2 — ⭐ **알려진 좁힘을 문면에 남긴다.** 보조 평면(U+10000 이상)의 구두점은 범위에
// 들어 있지 않다 — 쐐기문자·이집트 상형문자 같은 역사 문자의 부호라 한국어 인식기에서
// 올 자리가 없다고 보고 뺐다. 이 테스트가 깨진다면 누군가 그 평면을 덮은 것이고,
// 그때는 모듈 주석의 「덮지 못한 것」도 같이 고쳐야 한다.
test("보조 평면의 구두점은 덮지 않는다 — 알려진 좁힘이다", () => {
  const aegeanWordSeparator = String.fromCodePoint(0x10100);

  expect(/\p{P}/u.test(aegeanWordSeparator)).toBe(true);
  expect(normalizeSpeechText(aegeanWordSeparator, punctuationOnly)).toBe(aegeanWordSeparator);
});
