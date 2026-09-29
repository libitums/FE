import { describe, expect, it } from "vitest";

import { assessmentPassCriterion, judgeAssessment } from "../assessment/assessment";
import {
  initialSpeakingSessionState,
  isSpeakingSessionComplete,
  judgeSpeaking,
  matchedWordCount,
  speakingAnnouncement,
  speakingQuestionsForStep,
  speakingSessionReducer,
  speakingWords,
} from "./speaking";

// `unit` 계층: 순수 함수의 입출력 (ADR-0006 D4).

describe("matchedWordCount · judgeSpeaking", () => {
  it("앞에서부터 연달아 맞은 낱말만 센다", () => {
    expect(matchedWordCount("이거 주세요", "이거")).toBe(1);
    expect(matchedWordCount("이거 주세요", "이거 주세요")).toBe(2);
    expect(matchedWordCount("이거 주세요", "저거 주세요")).toBe(0);
  });

  it("문장 부호와 겹친 공백은 무시한다", () => {
    expect(matchedWordCount("이거 주세요", "이거,  주세요.")).toBe(2);
  });

  it("빈 인식은 0이고 오답이다", () => {
    expect(matchedWordCount("이거 주세요", "")).toBe(0);
    expect(judgeSpeaking("이거 주세요", "")).toBe("incorrect");
  });

  it("낱말을 전부 맞게 말해야 정답이다", () => {
    expect(judgeSpeaking("이거 주세요", "이거 주세요")).toBe("correct");
    expect(judgeSpeaking("이거 주세요", "이거")).toBe("incorrect");
  });

  it("문장을 공백으로 낱말로 가른다", () => {
    expect(speakingWords("제 이름은 민수예요")).toEqual(["제", "이름은", "민수예요"]);
  });
});

describe("speakingSessionReducer", () => {
  it("준비 → 듣는 중 → 판정 → 다음 문항", () => {
    let state = speakingSessionReducer(initialSpeakingSessionState, { type: "start" });
    expect(state.phase).toBe("listening");
    state = speakingSessionReducer(state, { type: "recognized", text: "a", result: "correct" });
    expect(state).toMatchObject({ phase: "judged", recognized: "a", results: ["correct"] });
    state = speakingSessionReducer(state, { type: "next" });
    expect(state).toMatchObject({
      questionIndex: 1,
      phase: "ready",
      recognized: "",
      results: ["correct"],
    });
  });

  // ⚠ **파수꾼입니다 — 오늘도 참이고 이후에도 참이어야 합니다.** 사용자가 건너뛴 문항은
  // `correct`로 실리지만(U-K1), 기기가 못 들은 문항은 **여전히 안 실립니다.** 기기 탓과
  // 사용자 사정은 다른 사건이라, 두 갈래가 같은 `results` 처리를 갖게 되면
  // *"기기 탓이 학습자 탓이 되면 안 된다"* 의 근거가 사라집니다.
  it("[U-K3] 인식을 쓸 수 없으면 결과를 싣지 않고 건너뛴다 — 기기 탓을 오답으로도 정답으로도 접지 않는다", () => {
    let state = speakingSessionReducer(initialSpeakingSessionState, { type: "start" });
    state = speakingSessionReducer(state, { type: "unavailable" });
    expect(state.phase).toBe("unavailable");
    state = speakingSessionReducer(state, { type: "next" });
    expect(state).toMatchObject({ questionIndex: 1, results: [] });
  });

  it("듣는 중이 아닐 때 온 인식 결과는 무시한다", () => {
    const state = speakingSessionReducer(initialSpeakingSessionState, {
      type: "recognized",
      text: "a",
      result: "correct",
    });
    expect(state).toBe(initialSpeakingSessionState);
  });

  it("준비 · 듣는 중에서는 다음으로 가지 않는다", () => {
    expect(speakingSessionReducer(initialSpeakingSessionState, { type: "next" })).toBe(
      initialSpeakingSessionState,
    );
  });

  it("채점 발화는 다른 학습형과 같은 형태다", () => {
    expect(speakingAnnouncement("correct")).toBe("채점 결과, 정답");
    expect(speakingAnnouncement("incorrect")).toBe("채점 결과, 오답");
  });
});

// ------------------------------------------------- 말하기 문항의 스킵 (D7 나 · C12)
//
// 사용자가 말하기 문항 **하나**를 건너뜁니다. 표지의 스킵(유닛 하나를 통째로 건너뜀)과
// **다른 사건**입니다 — 거는 단위도 이유도 결과도 갈립니다. 여기서 지는 것은 문항 쪽
// 하나뿐이고, 표지 쪽은 이 파일이 보지 않습니다.
//
// 「맞은거로 처리한다」가 사용자 발화이고, 그래서 건너뛴 문항이 `results`에 `"correct"`로
// 실립니다. 그 값이 통과 계산(`judgeAssessment`)에는 세어지고 만점 판정에는 안 세어지는
// 것이 D8이고, 그 갈림은 `lesson-complete.unit.test.ts`가 집니다 — 여기서는 **무엇이
// 실리는가**까지입니다.
describe("speakingSessionReducer — 건너뛰기", () => {
  it("[U-K1] 건너뛴 문항을 correct로 싣고 곧장 다음 문항으로 간다", () => {
    const state = speakingSessionReducer(initialSpeakingSessionState, { type: "skip" });

    // `next`를 따로 받지 않습니다 — 건너뛰기는 「이 문항을 끝낸다」와 「다음으로 간다」가
    // 한 걸음입니다. 판정 화면을 거치지 않으므로 `recognized`도 빈 문자열 그대로입니다.
    expect(state).toMatchObject({
      questionIndex: 1,
      phase: "ready",
      recognized: "",
      results: ["correct"],
      skippedCount: 1,
    });
  });

  it("[U-K1] 건너뛴 문항과 판정받은 문항이 한 `results`에 순서대로 쌓인다", () => {
    let state = speakingSessionReducer(initialSpeakingSessionState, { type: "skip" });
    state = speakingSessionReducer(state, { type: "start" });
    state = speakingSessionReducer(state, { type: "recognized", text: "a", result: "incorrect" });
    state = speakingSessionReducer(state, { type: "next" });

    expect(state).toMatchObject({
      questionIndex: 2,
      results: ["correct", "incorrect"],
      skippedCount: 1,
    });
  });

  // ⚠ **`ready`에서만 받는 것이 계약입니다.** 듣는 중에 받으면 인식 결과와 경합하고
  // (멈추면 결과가 한 번 옵니다), 판정 뒤에 받으면 이미 실린 결과를 덮습니다. 그래서
  // 「말하기를 누른 뒤에는 그 문항을 건너뛸 수 없다」가 대가로 남습니다.
  it("[U-K2] 듣는 중 · 판정 뒤에는 건너뛰기를 받지 않는다 — 같은 상태를 그대로 돌려준다", () => {
    const listening = speakingSessionReducer(initialSpeakingSessionState, { type: "start" });
    expect(listening.phase).toBe("listening");
    expect(speakingSessionReducer(listening, { type: "skip" })).toBe(listening);

    const judged = speakingSessionReducer(listening, {
      type: "recognized",
      text: "a",
      result: "incorrect",
    });
    expect(judged.phase).toBe("judged");
    expect(speakingSessionReducer(judged, { type: "skip" })).toBe(judged);
  });

  // 인식 불가 국면도 `ready`가 아닙니다 — 그 자리의 버튼은 이미 `건너뛰기`이고 그것이
  // 하는 일은 `next`입니다(결과를 안 싣습니다, U-K3). 여기서 `skip`을 받으면 기기 탓
  // 문항이 `correct`로 실려 U-K3이 말하는 갈림이 사라집니다.
  it("[U-K2] 인식 불가 국면에서도 건너뛰기를 받지 않는다", () => {
    let state = speakingSessionReducer(initialSpeakingSessionState, { type: "start" });
    state = speakingSessionReducer(state, { type: "unavailable" });

    expect(speakingSessionReducer(state, { type: "skip" })).toBe(state);
  });

  // ⚠ **D7의 논리적 귀결을 숨기지 않고 박습니다.** 통과선은 맞은 개수 2이고
  // (`assessmentPassCriterion`), `judgeAssessment`는 `correct`의 개수만 셉니다. 건너뛴
  // 문항이 `correct`로 실리면 **앞을 하나도 안 맞혀도 그것만으로 통과합니다.**
  // 「맞은거로 처리한다」를 따르면 이 결과가 나올 수밖에 없고, 그것을 막는 자리는
  // 통과 쪽이 아니라 **만점 쪽**입니다(D8 · `isPerfectLesson`).
  it("[U-K4] 말하기 셋을 전부 건너뛰면 결과가 correct 셋이고, 그것만으로 평가를 통과한다", () => {
    const total = speakingQuestionsForStep("introduction").length;
    expect(total).toBe(3);

    let state = initialSpeakingSessionState;
    for (let index = 0; index < total; index += 1) {
      state = speakingSessionReducer(state, { type: "skip" });
    }

    expect(isSpeakingSessionComplete(state, total)).toBe(true);
    expect(state.results).toEqual(["correct", "correct", "correct"]);
    expect(state.skippedCount).toBe(3);
    expect(judgeAssessment(state.results, assessmentPassCriterion)).toBe("passed");
  });
});
