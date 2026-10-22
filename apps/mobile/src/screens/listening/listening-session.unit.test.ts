import { describe, expect, it } from "vitest";

import {
  choiceAccessibilityLabel,
  choiceResultAt,
  hasAnswered,
  initialListeningSessionState,
  isSessionComplete,
  judgeAnswer,
  listeningCompletionAnnouncement,
  listeningSessionReducer,
  playbackStateAfterPlay,
  sessionAnswerResults,
  type ListeningQuestion,
  type ListeningSessionState,
} from "./listening";
import { uiCopyEn } from "../../lib/ui-copy-en";

// 기대값의 정본은 계약입니다 — 구현에서 베끼지 않습니다.
//
// 이후 변경이 이 파일의 모양을 갱신했습니다 — `ListeningSessionState`에
// `answeredChoiceIndexes` 필드가 늘고, `nextQuestion` 전이 하나가 이력을 쌓으며,
// `sessionAnswerResults`가 새로 늘었습니다.
//
// DOM·컴포넌트를 import하지 않습니다 — 순수 함수 아홉 + 고정 데이터만 봅니다.
// 그래서 toHaveClass·toHaveStyle·toBeVisible 같은 매처가 한 줄도 없습니다
// (docs/conventions/code.md 「jest-dom 매처는 절반만 쓴다」 · ADR-0006 D4).

// 계약의 고정 데이터에서 그대로 온 문항 둘입니다. 리터럴로 세웁니다 — 판정 함수의 red가 데이터 조회의 red와 섞이지 않게 합니다.
const questionAnswer0: ListeningQuestion = {
  prompt: "주문하시겠어요? 음료는 따뜻한 것과 차가운 것 중에 무엇으로 드릴까요?",
  romanization: "fixture",
  audioSource: "ordering-2",
  choices: [
    "음료 온도를 묻고 있다",
    "계산 방법을 묻고 있다",
    "자리를 안내하고 있다",
    "영업 시간을 알리고 있다",
  ],
  answerIndex: 0,
};

const questionAnswer2: ListeningQuestion = {
  prompt: "따뜻한 아메리카노 한 잔 주세요.",
  romanization: "fixture",
  audioSource: "ordering-1",
  choices: [
    "차가운 커피를 두 잔 주문하고 있다",
    "주문을 취소하고 있다",
    "따뜻한 커피를 한 잔 주문하고 있다",
    "물을 달라고 하고 있다",
  ],
  answerIndex: 2,
};

describe("judgeAnswer", () => {
  // choiceIndex === question.answerIndex ? "correct" : "incorrect"입니다.
  it("정답 인덱스를 고르면 correct다", () => {
    expect(judgeAnswer(questionAnswer0, questionAnswer0.answerIndex)).toBe("correct");
    expect(judgeAnswer(questionAnswer2, questionAnswer2.answerIndex)).toBe("correct");
  });

  it("정답이 아닌 인덱스를 고르면 incorrect다", () => {
    expect(judgeAnswer(questionAnswer0, (questionAnswer0.answerIndex + 1) % 4)).toBe("incorrect");
    expect(judgeAnswer(questionAnswer2, (questionAnswer2.answerIndex + 1) % 4)).toBe("incorrect");
  });

  it("보기 넷 중 정확히 하나만 correct다", () => {
    const results = [0, 1, 2, 3].map((index) => judgeAnswer(questionAnswer2, index));

    expect(results).toEqual(["incorrect", "incorrect", "correct", "incorrect"]);
  });

  it("정답이 0번인 문항에서도 0을 correct로 낸다 — 0을 거짓으로 다루지 않는다", () => {
    expect(judgeAnswer(questionAnswer0, 0)).toBe("correct");
    expect(judgeAnswer(questionAnswer0, 3)).toBe("incorrect");
  });
});

describe("choiceResultAt", () => {
  // 선택된 보기면 judgeAnswer, 아니면 null입니다.
  it("응답 전에는 어느 보기도 판정을 지지 않는다 — 전부 null", () => {
    const state: ListeningSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: null,
      answeredChoiceIndexes: [],
    };

    const results = [0, 1, 2, 3].map((index) => choiceResultAt(state, questionAnswer2, index));

    expect(results).toEqual([null, null, null, null]);
  });

  it("고른 보기가 정답이면 correct다", () => {
    const state: ListeningSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: 2,
      answeredChoiceIndexes: [],
    };

    expect(choiceResultAt(state, questionAnswer2, 2)).toBe("correct");
  });

  it("고른 보기가 오답이면 incorrect다", () => {
    const state: ListeningSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: 1,
      answeredChoiceIndexes: [],
    };

    expect(choiceResultAt(state, questionAnswer2, 1)).toBe("incorrect");
  });

  // 「정답을 알려 주지 않는다」입니다: 오답일 때 어느 것이 정답이었는지 표시하지
  // 않습니다.
  it("고르지 않은 보기는 정답이어도 판정을 지지 않는다 — null", () => {
    const state: ListeningSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: 1,
      answeredChoiceIndexes: [],
    };

    expect(choiceResultAt(state, questionAnswer2, 2)).toBeNull();
  });

  it("오답 응답 뒤에도 판정을 지는 보기는 고른 하나뿐이다", () => {
    const state: ListeningSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: 1,
      answeredChoiceIndexes: [],
    };

    const results = [0, 1, 2, 3].map((index) => choiceResultAt(state, questionAnswer2, index));

    expect(results).toEqual([null, "incorrect", null, null]);
  });

  it("0번 보기를 골라도 판정을 진다 — 0을 미응답으로 다루지 않는다", () => {
    const state: ListeningSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: 0,
      answeredChoiceIndexes: [],
    };

    expect(choiceResultAt(state, questionAnswer0, 0)).toBe("correct");
    expect(choiceResultAt(state, questionAnswer2, 0)).toBe("incorrect");
  });
});

describe("choiceAccessibilityLabel", () => {
  // 접미사 표입니다. 구분자는 쉼표 + 공백입니다 (ADR-0016 D3).
  it("판정이 없으면 접미사를 붙이지 않는다 — 텍스트 그대로", () => {
    expect(choiceAccessibilityLabel("음료 온도를 묻고 있다", null, uiCopyEn)).toBe(
      "음료 온도를 묻고 있다",
    );
  });

  it("correct는 정답 접미사를 붙인다", () => {
    expect(choiceAccessibilityLabel("음료 온도를 묻고 있다", "correct", uiCopyEn)).toBe(
      "음료 온도를 묻고 있다, correct",
    );
  });

  it("incorrect는 오답 접미사를 붙인다", () => {
    expect(choiceAccessibilityLabel("계산 방법을 묻고 있다", "incorrect", uiCopyEn)).toBe(
      "계산 방법을 묻고 있다, incorrect",
    );
  });

  // 응답 전 네 보기가 전부 접미사를 달면 답을 미리 알려 주는 것이 됩니다.
  it("판정이 없을 때 구분자(쉼표 + 공백)가 아예 생기지 않는다", () => {
    expect(choiceAccessibilityLabel("자리를 안내하고 있다", null, uiCopyEn)).not.toContain(", ");
  });

  it("세 경우가 서로 다른 문자열이다", () => {
    const text = "영업 시간을 알리고 있다";

    const labels = new Set([
      choiceAccessibilityLabel(text, null, uiCopyEn),
      choiceAccessibilityLabel(text, "correct", uiCopyEn),
      choiceAccessibilityLabel(text, "incorrect", uiCopyEn),
    ]);

    expect(labels.size).toBe(3);
  });
});

describe("hasAnswered", () => {
  // state.selectedChoiceIndex !== null — 응답 여부는 파생입니다.
  it("고른 보기가 없으면 false다", () => {
    expect(
      hasAnswered({ questionIndex: 0, selectedChoiceIndex: null, answeredChoiceIndexes: [] }),
    ).toBe(false);
  });

  it("고른 보기가 있으면 true다", () => {
    expect(
      hasAnswered({ questionIndex: 0, selectedChoiceIndex: 2, answeredChoiceIndexes: [] }),
    ).toBe(true);
  });

  it("0번 보기를 골라도 true다 — 0을 미응답으로 다루지 않는다", () => {
    expect(
      hasAnswered({ questionIndex: 1, selectedChoiceIndex: 0, answeredChoiceIndexes: [] }),
    ).toBe(true);
  });

  it("초기 상태는 미응답이다", () => {
    expect(hasAnswered(initialListeningSessionState)).toBe(false);
  });
});

describe("isSessionComplete", () => {
  // 완료는 상태에 적히지 않고 questionIndex >= total로 파생됩니다.
  it("마지막 문항에 응답만 한 상태는 아직 완료가 아니다", () => {
    expect(
      isSessionComplete(
        { questionIndex: 2, selectedChoiceIndex: 1, answeredChoiceIndexes: [0, 0] },
        3,
      ),
    ).toBe(false);
  });

  it("questionIndex가 문항 수와 같으면 완료다", () => {
    expect(
      isSessionComplete(
        { questionIndex: 3, selectedChoiceIndex: null, answeredChoiceIndexes: [0, 0, 0] },
        3,
      ),
    ).toBe(true);
  });

  it("첫 문항에 응답하지 않은 상태는 완료가 아니다", () => {
    expect(isSessionComplete(initialListeningSessionState, 3)).toBe(false);
  });

  it("questionIndex가 문항 수를 넘어도 완료다 — 판정은 >= 다", () => {
    expect(
      isSessionComplete(
        { questionIndex: 4, selectedChoiceIndex: null, answeredChoiceIndexes: [0, 0, 0, 0] },
        3,
      ),
    ).toBe(true);
  });
});

describe("listeningSessionReducer", () => {
  // 계약의 전이표 네 줄이 이 describe의 정본입니다. c는 고른 보기, a는 응답
  // 이력입니다. 바뀌는 줄은 넷째(nextQuestion — 응답했으면) 하나뿐이고, 나머지
  // 셋은 이력이 그대로 실려 나가거나(같은 참조) 이력이 늘지 않습니다.

  it("selectChoice — 응답 전이면 고른 보기가 기록된다 — 이력은 아직 안 는다", () => {
    const next = listeningSessionReducer(initialListeningSessionState, {
      type: "selectChoice",
      choiceIndex: 2,
    });

    expect(next).toEqual({ questionIndex: 0, selectedChoiceIndex: 2, answeredChoiceIndexes: [] });
  });

  it("selectChoice — 0번 보기도 기록된다", () => {
    const next = listeningSessionReducer(initialListeningSessionState, {
      type: "selectChoice",
      choiceIndex: 0,
    });

    expect(next).toEqual({ questionIndex: 0, selectedChoiceIndex: 0, answeredChoiceIndexes: [] });
  });

  it("selectChoice — 현재 문항 인덱스와 이력은 바뀌지 않는다", () => {
    const state: ListeningSessionState = {
      questionIndex: 2,
      selectedChoiceIndex: null,
      answeredChoiceIndexes: [1, 3],
    };

    const next = listeningSessionReducer(state, { type: "selectChoice", choiceIndex: 3 });

    expect(next).toEqual({
      questionIndex: 2,
      selectedChoiceIndex: 3,
      answeredChoiceIndexes: [1, 3],
    });
  });

  // 응답은 문항당 한 번뿐입니다. 막는 자리가 리듀서 하나입니다 — 컴포넌트가 아닙니다.
  it("selectChoice — 이미 응답했으면 다른 보기를 골라도 같은 참조를 돌려준다", () => {
    const state: ListeningSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: 2,
      answeredChoiceIndexes: [],
    };

    const next = listeningSessionReducer(state, { type: "selectChoice", choiceIndex: 1 });

    expect(next).toBe(state);
  });

  it("selectChoice — 이미 응답한 같은 보기를 다시 골라도 같은 참조를 돌려준다", () => {
    const state: ListeningSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: 2,
      answeredChoiceIndexes: [],
    };

    const next = listeningSessionReducer(state, { type: "selectChoice", choiceIndex: 2 });

    expect(next).toBe(state);
  });

  it("nextQuestion — 응답 전에는 같은 참조를 돌려준다", () => {
    const state: ListeningSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: null,
      answeredChoiceIndexes: [],
    };

    const next = listeningSessionReducer(state, { type: "nextQuestion" });

    expect(next).toBe(state);
  });

  it("nextQuestion — 응답했으면 다음 문항으로 가고 선택이 비워지며 이력에 고른 보기가 쌓인다", () => {
    const state: ListeningSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: 2,
      answeredChoiceIndexes: [],
    };

    const next = listeningSessionReducer(state, { type: "nextQuestion" });

    expect(next).toEqual({
      questionIndex: 1,
      selectedChoiceIndex: null,
      answeredChoiceIndexes: [2],
    });
  });

  // 이력이 느는 자리가 nextQuestion 하나입니다 — 이미 이력이 있는 상태에서도 새
  // 응답이 **끝에 이어붙습니다**(기존 이력을 덮어쓰지 않습니다).
  it("nextQuestion — 이미 쌓인 이력 뒤에 이번 응답이 이어붙는다", () => {
    const state: ListeningSessionState = {
      questionIndex: 1,
      selectedChoiceIndex: 3,
      answeredChoiceIndexes: [2],
    };

    const next = listeningSessionReducer(state, { type: "nextQuestion" });

    expect(next).toEqual({
      questionIndex: 2,
      selectedChoiceIndex: null,
      answeredChoiceIndexes: [2, 3],
    });
  });

  // 마지막 문항을 넘기면 완료 상태가 되고, 그 시점에
  // answeredChoiceIndexes.length === total입니다.
  it("nextQuestion — 마지막 문항에서 넘기면 완료 상태가 되고 이력 길이가 문항 수와 같다", () => {
    const state: ListeningSessionState = {
      questionIndex: 2,
      selectedChoiceIndex: 0,
      answeredChoiceIndexes: [2, 3],
    };

    const next = listeningSessionReducer(state, { type: "nextQuestion" });

    expect(next).toEqual({
      questionIndex: 3,
      selectedChoiceIndex: null,
      answeredChoiceIndexes: [2, 3, 0],
    });
    expect(isSessionComplete(next, 3)).toBe(true);
    expect(next.answeredChoiceIndexes).toHaveLength(3);
  });

  it("전이가 있으면 새 객체를 돌려준다 — 같은 참조가 아니다", () => {
    const state: ListeningSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: null,
      answeredChoiceIndexes: [],
    };

    expect(listeningSessionReducer(state, { type: "selectChoice", choiceIndex: 1 })).not.toBe(
      state,
    );
  });

  it("부수효과 없음 — 호출 뒤 입력 state 객체가 변형되지 않는다", () => {
    const state: ListeningSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: 2,
      answeredChoiceIndexes: [],
    };
    const snapshot: ListeningSessionState = {
      questionIndex: 0,
      selectedChoiceIndex: 2,
      answeredChoiceIndexes: [],
    };

    listeningSessionReducer(state, { type: "selectChoice", choiceIndex: 1 });
    listeningSessionReducer(state, { type: "nextQuestion" });

    expect(state).toEqual(snapshot);
  });

  it("세션 하나를 끝까지 돌리면 문항 셋을 지나 완료에 닿는다", () => {
    let state = initialListeningSessionState;

    for (let index = 0; index < 3; index += 1) {
      expect(state.questionIndex).toBe(index);
      state = listeningSessionReducer(state, { type: "selectChoice", choiceIndex: 0 });
      state = listeningSessionReducer(state, { type: "nextQuestion" });
    }

    expect(state).toEqual({
      questionIndex: 3,
      selectedChoiceIndex: null,
      answeredChoiceIndexes: [0, 0, 0],
    });
    expect(isSessionComplete(state, 3)).toBe(true);
  });

  // 불변식: 「문항 셋을 끝까지 돌면 answeredChoiceIndexes.length === 3이고 순서가
  // 응답 순서다」입니다. 위 케이스는 매번 같은 보기(0)를 골라 순서가 드러나지
  // 않으므로, 서로 다른 보기를 골라 순서까지 봅니다.
  it("불변식 — 서로 다른 보기를 고르며 끝까지 돌면 이력이 응답 순서 그대로 셋 쌓인다", () => {
    let state = initialListeningSessionState;
    const picks = [1, 3, 0];

    for (const choiceIndex of picks) {
      state = listeningSessionReducer(state, { type: "selectChoice", choiceIndex });
      state = listeningSessionReducer(state, { type: "nextQuestion" });
    }

    expect(state.answeredChoiceIndexes).toEqual(picks);
    expect(state.answeredChoiceIndexes).toHaveLength(3);
    expect(isSessionComplete(state, 3)).toBe(true);
  });
});

describe("initialListeningSessionState (고정 데이터)", () => {
  it("첫 문항이고 아무것도 고르지 않았고 응답 이력이 비어 있다", () => {
    expect(initialListeningSessionState).toEqual({
      questionIndex: 0,
      selectedChoiceIndex: null,
      answeredChoiceIndexes: [],
    });
  });
});

describe("sessionAnswerResults", () => {
  // judgeAnswer를 다시 쓰지 않고 부릅니다 — 리터럴로 세운 문항 둘로 판정의
  // 정본이 하나임을 확인합니다. questionAnswer0는 answerIndex 0, questionAnswer2는
  // answerIndex 2입니다.
  const questions: readonly ListeningQuestion[] = [questionAnswer0, questionAnswer2];

  it("이력과 같은 길이의 결과를 낸다 — i번째는 judgeAnswer(questions[i], a[i])와 같다", () => {
    const results = sessionAnswerResults(questions, [0, 2]);

    expect(results).toEqual(["correct", "correct"]);
  });

  it("오답을 섞어도 그 자리만 incorrect다", () => {
    const results = sessionAnswerResults(questions, [0, 1]);

    expect(results).toEqual(["correct", "incorrect"]);
  });

  it("이력이 문항 수보다 짧으면 짧은 쪽 길이로 끝난다 — 던지지 않는다", () => {
    expect(() => sessionAnswerResults(questions, [0])).not.toThrow();

    const results = sessionAnswerResults(questions, [0]);

    expect(results).toEqual(["correct"]);
  });

  it("빈 이력이면 빈 배열이다", () => {
    expect(sessionAnswerResults(questions, [])).toEqual([]);
  });

  it("문항이 없어도 던지지 않고 빈 배열이다", () => {
    expect(() => sessionAnswerResults([], [0, 1])).not.toThrow();
    expect(sessionAnswerResults([], [0, 1])).toEqual([]);
  });
});

describe("playbackStateAfterPlay", () => {
  // playAudio는 재생 **요청 한 번의 결과**를 돌려줍니다. 이 함수가 그 결과를
  // 화면이 보일 상태 어휘 둘로 옮깁니다.
  it("started면 재생 중이다", () => {
    expect(playbackStateAfterPlay("started")).toBe("playing");
  });

  // **이 케이스가 이 축의 고장 모드를 막는 유일한 자동 방어선입니다**
  // (「모듈이 없을 때 재생 중으로 보이지 않는다」). 모듈이 없으면 재생이
  // 시작되지 않았으므로 완료 신호도 오지 않습니다 — "playing"으로 옮기면
  // 화면이 영원히 `멈춤`에 갇히고, 고장이 정상인 척합니다.
  it("unavailable이면 대기다 — 「재생 중」으로 보이지 않는다", () => {
    expect(playbackStateAfterPlay("unavailable")).toBe("idle");
  });

  it("두 결과가 서로 다른 상태로 갈린다", () => {
    expect(playbackStateAfterPlay("started")).not.toBe(playbackStateAfterPlay("unavailable"));
  });

  it("예약 상태어 넷과 겹치지 않는다 — CSS 상태 클래스가 되지 않는다", () => {
    const reserved = ["selected", "done", "current", "locked"];

    expect(reserved).not.toContain(playbackStateAfterPlay("started"));
    expect(reserved).not.toContain(playbackStateAfterPlay("unavailable"));
  });
});

describe("listeningCompletionAnnouncement", () => {
  // U1 — 나아가는 라벨로 부르면 정해진 문자열과 **문자 그대로** 같습니다 (RL7).
  it("U1 — `See results`로 부르면 `All questions done, See results`다", () => {
    expect(listeningCompletionAnnouncement("See results", uiCopyEn)).toBe(
      "All questions done, See results",
    );
  });

  // U2 — 인자가 형식을 실제로 통과합니다.
  it("U2 — 다른 인자 둘의 반환이 다르고, 앞절 뒤가 쉼표+공백 하나와 그 인자다", () => {
    const withFinish = listeningCompletionAnnouncement("See results", uiCopyEn);
    const withExit = listeningCompletionAnnouncement("Back to map", uiCopyEn);

    expect(withFinish).not.toBe(withExit);
    expect(withFinish).toBe("All questions done, See results");
    expect(withExit).toBe("All questions done, Back to map");
  });

  // U4 — 부수효과가 없습니다.
  it("U4 — 같은 인자로 두 번 불러도 같은 값이고 던지지 않는다", () => {
    expect(() => listeningCompletionAnnouncement("See results", uiCopyEn)).not.toThrow();
    expect(listeningCompletionAnnouncement("See results", uiCopyEn)).toBe(
      listeningCompletionAnnouncement("See results", uiCopyEn),
    );
  });
});
