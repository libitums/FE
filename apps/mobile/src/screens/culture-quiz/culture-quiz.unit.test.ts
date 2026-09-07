import { describe, expect, it } from "vitest";

import type { JourneyStepId } from "../journey-map/journey-map";
import { listeningFinishLabel } from "../listening/listening";
import { sentenceOrderFinishLabel } from "../sentence-order/sentence-order";
import { wordChoiceFinishLabel } from "../word-choice/word-choice";
import * as cultureQuizModule from "./culture-quiz";
import {
  choiceResultAt,
  cultureQuizCompletionAnnouncement,
  cultureQuizCompletionText,
  cultureQuizExitLabel,
  cultureQuizProgressLabel,
  cultureQuizQuestionsForStep,
  cultureQuizScreenTitle,
  cultureQuizSessionReducer,
  hasAnswered,
  initialCultureQuizSessionState,
  isCultureQuizSessionComplete,
  judgeCultureQuiz,
  optionAccessibilityLabel,
  type CultureQuizQuestion,
  type CultureQuizSessionState,
} from "./culture-quiz";

// 계약: .agent-harness/work/lib-244/spec.md §8.1 (unit — required, U1~U10)
// · §3.3 순수 함수 여덟 · 상수 하나의 표 · §3.2 타입.
// 기대값의 정본은 계약이다 — 구현(culture-quiz.ts)에서 베끼지 않는다.
//
// DOM·컴포넌트를 import하지 않는다 — 순수 함수 열 + 문항 데이터 자리만 본다.
// toHaveClass·toHaveStyle·toBeVisible 같은 매처가 한 줄도 없다
// (docs/conventions/code.md 「jest-dom 매처는 절반만 쓴다」 · ADR-0006 D4).
//
// 계약 D5 · §3.4: cultureQuizQuestionsByStep의 값은 이 계약이 지어내지 않는다 —
// 다섯 키 전부 빈 배열이다. 그래서 이 파일의 픽스처는 export되지 않는 표를 읽지 않고
// **파일 안에서 직접 만든다**(표 자체가 export되지 않으므로 읽을 수도 없다 — §3.1).
//
// U-INV(범위 불변식)는 오늘 쓰지 않는다 — 문항 표가 비어 있어 공허하게 통과한다
// (계약 §8.1 「U-INV (오늘 쓰지 않는다)」 · D5).

const stepIds: readonly JourneyStepId[] = [
  "greeting",
  "introduction",
  "ordering",
  "appointment",
  "directions",
];

// 픽스처 — answerIndex가 0인 문항. U4 · U5의 "answerIndex가 0인 문항에서 0번 보기가
// correct다" 단언을 세우는 데 쓴다(0을 거짓으로 다루는 자리를 만들지 않는다).
const questionAnswer0: CultureQuizQuestion = {
  prompt: "설날에 어른께 드리는 인사는?",
  choices: ["세배", "성묘", "차례"],
  answerIndex: 0,
};

const questionAnswer2: CultureQuizQuestion = {
  prompt: "한국에서 숫자 4를 꺼리는 이유와 관련 있는 것은?",
  choices: ["死(죽을 사)", "행운의 숫자", "왕의 숫자", "봄의 숫자"],
  answerIndex: 2,
};

describe("cultureQuizScreenTitle", () => {
  // 계약 U1: 서수 셋(1·3·5)에서 `${n}단계 · 문화 퀴즈` 형식이다
  it("서수 1은 1단계 · 문화 퀴즈다", () => {
    expect(cultureQuizScreenTitle(1)).toBe("1단계 · 문화 퀴즈");
  });

  it("서수 3은 3단계 · 문화 퀴즈다", () => {
    expect(cultureQuizScreenTitle(3)).toBe("3단계 · 문화 퀴즈");
  });

  it("여정의 마지막 서수 5도 같은 형식이다", () => {
    expect(cultureQuizScreenTitle(5)).toBe("5단계 · 문화 퀴즈");
  });
});

describe("cultureQuizProgressLabel", () => {
  // 계약 U2: cultureQuizProgressLabel(0, 3) === "문항 1 / 3" — 0-based가 1-based 문구가 된다
  it("첫 문항(0, 3)은 문항 1 / 3이다", () => {
    expect(cultureQuizProgressLabel(0, 3)).toBe("문항 1 / 3");
  });

  it("마지막 문항(2, 3)은 문항 3 / 3이다", () => {
    expect(cultureQuizProgressLabel(2, 3)).toBe("문항 3 / 3");
  });

  it("중간 문항(1, 3)은 문항 2 / 3이다", () => {
    expect(cultureQuizProgressLabel(1, 3)).toBe("문항 2 / 3");
  });
});

describe("cultureQuizQuestionsForStep", () => {
  // 계약 U3: 다섯 스텝 어느 것에도 던지지 않고 undefined가 아니다.
  // ⚠ 어느 스텝이 몇 문항인지는 단언하지 않는다 — 값이 임시라(D5) 박으면
  // 교체가 공짜가 아니게 된다.
  it("다섯 스텝 전부 던지지 않는다", () => {
    for (const id of stepIds) {
      expect(() => cultureQuizQuestionsForStep(id)).not.toThrow();
    }
  });

  it("다섯 스텝 전부 undefined가 아니다", () => {
    for (const id of stepIds) {
      expect(cultureQuizQuestionsForStep(id)).not.toBeUndefined();
    }
  });
});

describe("judgeCultureQuiz", () => {
  // 계약 U4: answerIndex === choiceIndex면 "correct", 아니면 "incorrect".
  // answerIndex: 0인 fixture를 포함한다 — 0을 falsy로 다루면 여기서 잡힌다.
  it("정답 인덱스를 고르면 correct다 — answerIndex가 0인 문항도 포함한다", () => {
    expect(judgeCultureQuiz(questionAnswer0, 0)).toBe("correct");
    expect(judgeCultureQuiz(questionAnswer2, 2)).toBe("correct");
  });

  it("정답이 아닌 인덱스를 고르면 incorrect다", () => {
    expect(judgeCultureQuiz(questionAnswer0, 1)).toBe("incorrect");
    expect(judgeCultureQuiz(questionAnswer2, 0)).toBe("incorrect");
  });

  it("0번 보기가 정답이 아닌 문항에서 0번을 골라도 incorrect다 — 0을 특수 취급하지 않는다", () => {
    expect(judgeCultureQuiz(questionAnswer2, 0)).toBe("incorrect");
  });
});

describe("choiceResultAt", () => {
  // 계약 U5: 고른 보기만 판정을 지고, 고르지 않은 정답 보기가 null이다.
  // 미응답 상태에서 모든 보기가 null이다.
  it("응답 전에는 어느 보기도 판정을 지지 않는다 — 전부 null", () => {
    const state: CultureQuizSessionState = { questionIndex: 0, selectedChoiceIndex: null };

    const results = questionAnswer2.choices.map((_choice, index) =>
      choiceResultAt(state, questionAnswer2, index),
    );

    expect(results).toEqual([null, null, null, null]);
  });

  it("고른 보기가 정답이면 correct다", () => {
    const state: CultureQuizSessionState = { questionIndex: 0, selectedChoiceIndex: 2 };

    expect(choiceResultAt(state, questionAnswer2, 2)).toBe("correct");
  });

  it("고른 보기가 오답이면 incorrect다", () => {
    const state: CultureQuizSessionState = { questionIndex: 0, selectedChoiceIndex: 0 };

    expect(choiceResultAt(state, questionAnswer2, 0)).toBe("incorrect");
  });

  it("고르지 않은 보기는 정답이어도 판정을 지지 않는다 — null", () => {
    const state: CultureQuizSessionState = { questionIndex: 0, selectedChoiceIndex: 0 };

    expect(choiceResultAt(state, questionAnswer2, 2)).toBeNull();
  });

  it("0번 보기를 골라도 판정을 진다 — 0을 미응답으로 다루지 않는다", () => {
    const state: CultureQuizSessionState = { questionIndex: 0, selectedChoiceIndex: 0 };

    expect(choiceResultAt(state, questionAnswer0, 0)).toBe("correct");
    expect(choiceResultAt(state, questionAnswer2, 0)).toBe("incorrect");
  });
});

describe("optionAccessibilityLabel", () => {
  // 계약 U6: null이면 접미사가 없고, 판정이 있으면 ", 정답"/", 오답"이 붙는다.
  // 구분자는 쉼표 + 공백(ADR-0016 D3).
  it("판정이 없으면 접미사를 붙이지 않는다 — 텍스트 그대로", () => {
    expect(optionAccessibilityLabel("세배", null)).toBe("세배");
  });

  it("correct는 정답 접미사를 붙인다", () => {
    expect(optionAccessibilityLabel("세배", "correct")).toBe("세배, 정답");
  });

  it("incorrect는 오답 접미사를 붙인다", () => {
    expect(optionAccessibilityLabel("성묘", "incorrect")).toBe("성묘, 오답");
  });

  it("판정이 없을 때 구분자(쉼표 + 공백)가 아예 생기지 않는다", () => {
    expect(optionAccessibilityLabel("차례", null)).not.toContain(", ");
  });

  it("세 경우가 서로 다른 문자열이다", () => {
    const text = "차례";

    const labels = new Set([
      optionAccessibilityLabel(text, null),
      optionAccessibilityLabel(text, "correct"),
      optionAccessibilityLabel(text, "incorrect"),
    ]);

    expect(labels.size).toBe(3);
  });
});

describe("hasAnswered", () => {
  // 계약 U7: selectedChoiceIndex: 0에서 참이다 — 0을 falsy로 다루면 여기서 잡힌다.
  it("고른 보기가 없으면 false다", () => {
    expect(hasAnswered({ questionIndex: 0, selectedChoiceIndex: null })).toBe(false);
  });

  it("고른 보기가 있으면 true다", () => {
    expect(hasAnswered({ questionIndex: 0, selectedChoiceIndex: 2 })).toBe(true);
  });

  it("0번 보기를 골라도 true다 — 0을 미응답으로 다루지 않는다", () => {
    expect(hasAnswered({ questionIndex: 1, selectedChoiceIndex: 0 })).toBe(true);
  });

  it("초기 상태는 미응답이다", () => {
    expect(hasAnswered(initialCultureQuizSessionState)).toBe(false);
  });
});

describe("isCultureQuizSessionComplete", () => {
  // 계약 U8: questionIndex === total에서 참, total - 1에서 거짓.
  it("questionIndex가 total과 같으면 완료다", () => {
    expect(isCultureQuizSessionComplete({ questionIndex: 3, selectedChoiceIndex: null }, 3)).toBe(
      true,
    );
  });

  it("questionIndex가 total - 1이면 아직 완료가 아니다", () => {
    expect(isCultureQuizSessionComplete({ questionIndex: 2, selectedChoiceIndex: null }, 3)).toBe(
      false,
    );
  });

  it("questionIndex가 total을 넘어도 완료다 — 판정은 >= 다", () => {
    expect(isCultureQuizSessionComplete({ questionIndex: 4, selectedChoiceIndex: null }, 3)).toBe(
      true,
    );
  });

  it("초기 상태는 완료가 아니다", () => {
    expect(isCultureQuizSessionComplete(initialCultureQuizSessionState, 3)).toBe(false);
  });
});

describe("cultureQuizSessionReducer", () => {
  // 계약 U9: 전이 넷(§3.3). 무변화 둘은 toBe로 같은 참조임을 짓는다.

  it("selectChoice — 미응답 상태면 고른 보기가 기록된다", () => {
    const next = cultureQuizSessionReducer(initialCultureQuizSessionState, {
      type: "selectChoice",
      choiceIndex: 2,
    });

    expect(next).toEqual({ questionIndex: 0, selectedChoiceIndex: 2 });
  });

  it("selectChoice — 0번 보기도 기록된다", () => {
    const next = cultureQuizSessionReducer(initialCultureQuizSessionState, {
      type: "selectChoice",
      choiceIndex: 0,
    });

    expect(next).toEqual({ questionIndex: 0, selectedChoiceIndex: 0 });
  });

  // 막는 자리가 리듀서 하나다 — 컴포넌트에 둘째 게이트를 두지 않는다(§3.3).
  it("selectChoice — 이미 응답했으면 다른 보기를 골라도 같은 참조를 돌려준다", () => {
    const state: CultureQuizSessionState = { questionIndex: 0, selectedChoiceIndex: 2 };

    const next = cultureQuizSessionReducer(state, { type: "selectChoice", choiceIndex: 1 });

    expect(next).toBe(state);
  });

  it("nextQuestion — 응답 전에는 같은 참조를 돌려준다", () => {
    const state: CultureQuizSessionState = { questionIndex: 0, selectedChoiceIndex: null };

    const next = cultureQuizSessionReducer(state, { type: "nextQuestion" });

    expect(next).toBe(state);
  });

  it("nextQuestion — 응답했으면 다음 문항으로 가고 선택이 비워진다", () => {
    const state: CultureQuizSessionState = { questionIndex: 0, selectedChoiceIndex: 2 };

    const next = cultureQuizSessionReducer(state, { type: "nextQuestion" });

    expect(next).toEqual({ questionIndex: 1, selectedChoiceIndex: null });
  });

  it("nextQuestion — 0번 보기에 응답했어도 다음 문항으로 간다", () => {
    const state: CultureQuizSessionState = { questionIndex: 1, selectedChoiceIndex: 0 };

    const next = cultureQuizSessionReducer(state, { type: "nextQuestion" });

    expect(next).toEqual({ questionIndex: 2, selectedChoiceIndex: null });
  });

  it("전이가 있으면 새 객체를 돌려준다 — 같은 참조가 아니다", () => {
    const state: CultureQuizSessionState = { questionIndex: 0, selectedChoiceIndex: null };

    expect(cultureQuizSessionReducer(state, { type: "selectChoice", choiceIndex: 1 })).not.toBe(
      state,
    );
  });

  it("부수효과 없음 — 호출 뒤 입력 state 객체가 변형되지 않는다", () => {
    const state: CultureQuizSessionState = { questionIndex: 0, selectedChoiceIndex: 2 };
    const snapshot: CultureQuizSessionState = { questionIndex: 0, selectedChoiceIndex: 2 };

    cultureQuizSessionReducer(state, { type: "selectChoice", choiceIndex: 1 });
    cultureQuizSessionReducer(state, { type: "nextQuestion" });

    expect(state).toEqual(snapshot);
  });

  it("세션 하나를 끝까지 돌리면 문항 셋을 지나 완료에 닿는다", () => {
    let state = initialCultureQuizSessionState;

    for (let index = 0; index < 3; index += 1) {
      expect(state.questionIndex).toBe(index);
      state = cultureQuizSessionReducer(state, { type: "selectChoice", choiceIndex: 0 });
      state = cultureQuizSessionReducer(state, { type: "nextQuestion" });
    }

    expect(state).toEqual({ questionIndex: 3, selectedChoiceIndex: null });
    expect(isCultureQuizSessionComplete(state, 3)).toBe(true);
  });
});

describe("initialCultureQuizSessionState (고정 데이터)", () => {
  it("첫 문항이고 아무것도 고르지 않았다", () => {
    expect(initialCultureQuizSessionState).toEqual({
      questionIndex: 0,
      selectedChoiceIndex: null,
    });
  });
});

describe("D1 — 진행을 걸지 않는다 (U10, 계약 §2 D1 · §10-4의 기계 검사)", () => {
  // (a) culture-quiz.ts가 내보내는 값 중 AnswerResult 배열을 돌려주는 export가 0건이다.
  // 단어 선택의 `wordChoiceSessionResults` 같은 이력→판정 함수에 해당하는 자리를
  // 만들지 않는다는 것을, 정본 export 목록과의 열거 대조로 짓는다 — 새 export가
  // 몰래 늘면(예: `cultureQuizSessionResults`) 이 목록이 어긋나 잡힌다.
  // 케이스 이름은 **닫힌 목록과 같다**만 말한다 — 타입은 런타임 열거에 애초에
  // 안 잡힌다. 이름이 타입까지 세면 초록인 채로 이름이 거짓이 된다
  // (계약 §8.1 U10 정정).
  // ⚠ 이름에서 **개수를 걷었다.** 단언이 보는 것은 개수가 아니라 이름 목록이고,
  //   목록이 자랄 때마다 이름에 박힌 수가 조용히 낡는다(LIB-247 계약 §2 · §8의
  //   「개수를 문면에 박지 않는다」). 목록이 **닫혀 있다**는 사실은 그대로다 —
  //   toEqual이 여분의 이름도 잡는다.
  // ⚠ LIB-247이 이 목록을 셋 넓힌다(cultureQuizCompletionAnnouncement ·
  //   cultureQuizCompletionText · cultureQuizExitLabel). 이 케이스가 지키는 축은
  //   그대로다 — `cultureQuizSessionResults` 같은 이력→판정 export가 몰래 끼어드는
  //   것(D1 「진행을 걸지 않는다」)을 여전히 잡는다.
  it("값 export가 허용목록과 정확히 같다 — 타입은 런타임 열거에 안 잡힌다", () => {
    const expectedValueExports = [
      "choiceResultAt",
      "cultureQuizCompletionAnnouncement",
      "cultureQuizCompletionText",
      "cultureQuizExitLabel",
      "cultureQuizProgressLabel",
      "cultureQuizQuestionsForStep",
      "cultureQuizScreenTitle",
      "cultureQuizSessionReducer",
      "hasAnswered",
      "initialCultureQuizSessionState",
      "isCultureQuizSessionComplete",
      "judgeCultureQuiz",
      "optionAccessibilityLabel",
    ].sort();

    expect(Object.keys(cultureQuizModule).sort()).toEqual(expectedValueExports);
  });

  // (b) 세션 상태에 응답 이력 필드가 없다 — 죽은 필드를 만들지 않는다(§3.2).
  it("세션 상태의 키가 questionIndex · selectedChoiceIndex 둘뿐이다 — 이력 필드가 없다", () => {
    expect(Object.keys(initialCultureQuizSessionState).sort()).toEqual([
      "questionIndex",
      "selectedChoiceIndex",
    ]);
  });
});

// ---------------------------------------------------------------- 완료 전이 발화 (LIB-247)
// 계약: .agent-harness/work/lib-247/spec.md §6.1 (unit — U1~U4) · §3.1(export 목록)
// · §3.2(시그니처와 반환 문자열) · §3.3(a)(규칙은 하나이고 값이 갈린다).
// 기대값의 정본은 계약이다 — culture-quiz.ts에서 베끼지 않는다.
//
// 「정확히 한 번」은 이 계층이 지지 않는다 — 그것은 `ui`의 X-C다(계약 §6.2).
// 이 화면의 기존 「announce 0건」 케이스를 조이는 것도 `ui`의 일이다(§6.2(f)).

describe("완료 전이 발화의 상수 둘 (계약 §3.1 표 · §3.2)", () => {
  // 화면이 렌더하는 낱말과 발화가 담는 낱말이 **같은 자리**에서 나온다 (ADR-0016 D11-1).
  it("완료 문구 상수가 화면에 이미 있는 `문항을 모두 마쳤어요`다", () => {
    expect(cultureQuizCompletionText).toBe("문항을 모두 마쳤어요");
  });

  // ⚠ 둘째 상수의 **이름**이 넷 중 이 화면만 다르다(`…ExitLabel`). 이 화면의 그 낱말은
  // 나아가는 수단이 아니라 **나가는 수단**이고(`culture-quiz-screen-exit`),
  // 어느 시점에도 렌더된다(계약 §3.1 ⚠ · §0.6(b)).
  it("완료 상태의 유일한 조작 단위 라벨이 `맵으로`다 — 나가는 수단이다", () => {
    expect(cultureQuizExitLabel).toBe("맵으로");
  });
});

describe("cultureQuizCompletionAnnouncement (계약 §6.1 U1~U4)", () => {
  // U1 — 오늘 호출자가 넘기는 값(계약 §4.4 표)으로 부르면 §3.2 표의 문자열과
  // **문자 그대로** 같다. 이 화면만 뒷절이 갈린다.
  it("U1 — cultureQuizExitLabel로 부르면 `문항을 모두 마쳤어요, 맵으로`다", () => {
    expect(cultureQuizCompletionAnnouncement(cultureQuizExitLabel)).toBe(
      "문항을 모두 마쳤어요, 맵으로",
    );
  });

  // U2 — 인자가 형식을 실제로 통과한다. 이 단언이 있어야 「인자 없는 상수 반환」의
  // 공허함을 피한 것이 지어진다(계약 §6.1 U2 · §3.4 넷째 행).
  it("U2 — 다른 인자 둘의 반환이 다르고, 완료 문구 뒤가 쉼표+공백 하나와 그 인자다", () => {
    const withExit = cultureQuizCompletionAnnouncement("맵으로");
    const withFinish = cultureQuizCompletionAnnouncement("결과 보기");

    expect(withExit).not.toBe(withFinish);
    expect(withExit.slice(cultureQuizCompletionText.length)).toBe(", 맵으로");
    expect(withFinish.slice(cultureQuizCompletionText.length)).toBe(", 결과 보기");
  });

  // U3 — 앞절이 그 화면의 완료 문구 상수를 지난다. 리터럴을 다시 적지 않는다 —
  // 적으면 정본이 둘이 되고, 상수를 인라인 리터럴로 흩어도 이 단언이 안 잡는다.
  it("U3 — 앞절이 cultureQuizCompletionText와 같은 표를 지난다", () => {
    expect(
      cultureQuizCompletionAnnouncement(cultureQuizExitLabel).startsWith(cultureQuizCompletionText),
    ).toBe(true);
  });

  // U4 — 부수효과가 없다. `announce`를 부르지 않는 순수 함수라 호스트가 없어도 던지지 않는다.
  it("U4 — 같은 인자로 두 번 불러도 같은 값이고 던지지 않는다", () => {
    expect(() => cultureQuizCompletionAnnouncement(cultureQuizExitLabel)).not.toThrow();
    expect(cultureQuizCompletionAnnouncement(cultureQuizExitLabel)).toBe(
      cultureQuizCompletionAnnouncement(cultureQuizExitLabel),
    );
  });
});

describe("문화 퀴즈의 값이 나머지 셋과 갈린다 (계약 §3.3(a) · §9-6)", () => {
  // 나머지 셋의 라벨을 **리터럴로 다시 적지 않고 그 모듈에서 읽는다** — 정본을 둘로
  // 만들지 않는다. 셋 중 하나가 갈리는 날에도 이 단언이 그것을 본다.
  it("앞절은 넷이 같고 뒷절만 갈린다 — 규칙은 하나다", () => {
    expect([listeningFinishLabel, wordChoiceFinishLabel, sentenceOrderFinishLabel]).toEqual([
      "결과 보기",
      "결과 보기",
      "결과 보기",
    ]);
    expect(cultureQuizExitLabel).not.toBe(listeningFinishLabel);
  });

  // 갈림이 예외 조항이 아니라 **그 화면이 다르기 때문**이라는 것 — 규칙
  // 「<완료 문구>, <완료 상태에서 유일한 조작 단위의 라벨>」을 넷이 함께 지난다.
  // ⚠ `결과 보기`는 이 화면에 **없는 낱말**이다(`onFinish`가 없다 — LIB-244 D1).
  //    소리에만 있는 낱말을 만들지 않는 것이 이 갈림의 이유다.
  it("이 화면의 발화가 셋의 발화와 다르다 — 소리에만 있는 낱말을 만들지 않는다", () => {
    expect(cultureQuizCompletionAnnouncement(cultureQuizExitLabel)).not.toBe(
      "문항을 모두 마쳤어요, 결과 보기",
    );
    expect(cultureQuizCompletionAnnouncement(cultureQuizExitLabel)).toBe(
      "문항을 모두 마쳤어요, 맵으로",
    );
  });
});
