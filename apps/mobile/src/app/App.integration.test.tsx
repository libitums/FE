import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import type { JourneyStepId } from "../screens/journey-map/journey-map";
import { questionsForStep } from "../screens/listening/listening";

// `integration` 계층: 여러 실제 모듈의 협력 (ADR-0006 D4).
// 여기서는 App · navReducer · BottomNavigator · 화면 넷 · ErrorBoundary가 맞물린다.
// 목킹하지 않는다 — 외부 IO가 생기면 그 경계에서만 대체한다.
//
// 텍스트 질의(`getByText`)는 쓰지 않는다 — 화면 제목과 탭 라벨이 같은 문자열을
// 공유하는 조합이 있어(`홈`, `설정`) 모호하다. 전부 `data-testid`로 질의한다
// (testids.contract.ts).

test("루트가 현재 탭 스택의 최상단 화면을 렌더한다", () => {
  render(<App />);

  expect(screen.getByTestId("home-screen-title")).toHaveTextContent("홈");
  expect(screen.getByTestId("bottom-navigator-tab-home")).toHaveAttribute("data-selected", "true");
  expect(screen.getByTestId("bottom-navigator-tab-journey")).toHaveAttribute(
    "data-selected",
    "false",
  );
  expect(screen.getByTestId("bottom-navigator-tab-roleplay")).toHaveAttribute(
    "data-selected",
    "false",
  );
  expect(screen.getByTestId("bottom-navigator-tab-settings")).toHaveAttribute(
    "data-selected",
    "false",
  );
});

test("여정 탭으로 전환하면 여정 맵 화면이 나오고 홈 화면은 사라진다", () => {
  render(<App />);

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});

  expect(screen.getByTestId("journey-map-screen-title")).toHaveTextContent("여정 맵");
  expect(screen.queryByTestId("home-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("bottom-navigator-tab-journey")).toHaveAttribute(
    "data-selected",
    "true",
  );
  expect(screen.getByTestId("bottom-navigator-tab-home")).toHaveAttribute("data-selected", "false");
});

test("롤플레이 탭으로 전환하면 롤플레이 화면이 나오고 홈 화면은 사라진다", () => {
  render(<App />);

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-roleplay"), {});

  expect(screen.getByTestId("roleplay-list-screen-title")).toHaveTextContent("롤플레이");
  expect(screen.queryByTestId("home-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("bottom-navigator-tab-roleplay")).toHaveAttribute(
    "data-selected",
    "true",
  );
  expect(screen.getByTestId("bottom-navigator-tab-home")).toHaveAttribute("data-selected", "false");
});

test("설정 탭으로 전환하면 설정 화면이 나오고 홈 화면은 사라진다", () => {
  render(<App />);

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-settings"), {});

  expect(screen.getByTestId("settings-screen-title")).toHaveTextContent("설정");
  expect(screen.queryByTestId("home-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("bottom-navigator-tab-settings")).toHaveAttribute(
    "data-selected",
    "true",
  );
  expect(screen.getByTestId("bottom-navigator-tab-home")).toHaveAttribute("data-selected", "false");
});

test("홈 → 여정 → 홈으로 왕복하면 홈의 루트 화면이 그대로 다시 나온다", () => {
  render(<App />);

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  expect(screen.getByTestId("journey-map-screen-title")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-home"), {});

  expect(screen.getByTestId("home-screen-title")).toHaveTextContent("홈");
  expect(screen.queryByTestId("journey-map-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("bottom-navigator-tab-home")).toHaveAttribute("data-selected", "true");
});

// -------------------------------------------------------------------------
// LIB-222 — 여정 맵 + 스텝 시트. 계약 §3.3의 경계 1~5를 여기서 검증한다.
// `App` · `navReducer` · `BottomNavigator` · `JourneyMapScreen` · `JourneyStepNode` ·
// `StepSheet`가 실제로 맞물리는지를 본다. 목킹하지 않는다 — 외부 IO가 없다.

test("여정 탭으로 전환하면 스텝 다섯이 전부 렌더된다", () => {
  render(<App />);

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});

  expect(screen.getByTestId("journey-step-node-greeting")).toBeInTheDocument();
  expect(screen.getByTestId("journey-step-node-introduction")).toBeInTheDocument();
  expect(screen.getByTestId("journey-step-node-ordering")).toBeInTheDocument();
  expect(screen.getByTestId("journey-step-node-appointment")).toBeInTheDocument();
  expect(screen.getByTestId("journey-step-node-directions")).toBeInTheDocument();
});

// 계약 §3.3-2 · 수용 기준 5(스택 깊이 불변)의 **대리 관찰**이다. `Nav` 스택 깊이는 밖으로
// 노출되지 않으므로 직접 셀 수 없다 — 시트가 열려도 셸(탭 넷 · 여정 탭의 선택 상태)이
// 그대로라는 것으로 대신 본다. 셸이 사라지거나 선택이 바뀌면 스택이 깊어졌다는 신호다.
test("스텝을 누르면 시트가 열리고 셸이 그대로다", () => {
  render(<App />);
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});

  fireEvent.tap(screen.getByTestId("journey-step-node-ordering"), {});

  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
  expect(screen.getByTestId("bottom-navigator-tab-journey")).toHaveAttribute(
    "data-selected",
    "true",
  );
  expect(screen.getByTestId("bottom-navigator-tab-home")).toBeInTheDocument();
  expect(screen.getByTestId("bottom-navigator-tab-roleplay")).toBeInTheDocument();
  expect(screen.getByTestId("bottom-navigator-tab-settings")).toBeInTheDocument();
});

test("시트를 닫으면 시트만 사라지고 화면 제목과 셸은 그대로다", () => {
  render(<App />);
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  fireEvent.tap(screen.getByTestId("journey-step-node-ordering"), {});
  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("step-sheet-close"), {});

  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
  expect(screen.getByTestId("journey-map-screen-title")).toHaveTextContent("여정 맵");
  expect(screen.getByTestId("bottom-navigator-tab-home")).toBeInTheDocument();
  expect(screen.getByTestId("bottom-navigator-tab-roleplay")).toBeInTheDocument();
  expect(screen.getByTestId("bottom-navigator-tab-settings")).toBeInTheDocument();
});

// 시트 상태는 `Nav`가 아니라 화면 로컬 상태다(ADR-0007 D1) — 탭을 떠나면 `JourneyMapScreen`이
// 언마운트되며 `useReducer` 상태가 버려진다. 그래서 되돌아왔을 때 시트는 닫혀 있는 것이
// 정상이다. 기대를 뒤집지 않는다(계약 §3.3-4).
test("시트를 연 채 다른 탭으로 갔다 여정 탭으로 돌아오면 시트가 닫혀 있다", () => {
  render(<App />);
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  fireEvent.tap(screen.getByTestId("journey-step-node-ordering"), {});
  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-home"), {});
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});

  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
  expect(screen.getByTestId("journey-map-screen-title")).toHaveTextContent("여정 맵");
});

test("시트가 열린 동안에도 탭 전환이 동작한다", () => {
  render(<App />);
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  fireEvent.tap(screen.getByTestId("journey-step-node-ordering"), {});
  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-roleplay"), {});

  expect(screen.getByTestId("roleplay-list-screen-title")).toHaveTextContent("롤플레이");
  expect(screen.queryByTestId("journey-map-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("bottom-navigator-tab-roleplay")).toHaveAttribute(
    "data-selected",
    "true",
  );
});

// -------------------------------------------------------------------------
// LIB-223 — 학습 루프. 계약 §3.3의 경계 1~8을 여기서 검증한다.
// `App` · `navReducer` · `BottomNavigator` · `JourneyMapScreen` · `StepSheet` ·
// `ListeningScreen` · `ListeningChoice` · 순수 함수 셋(`journeyStepOrdinal` ·
// `completeStep` · `listeningSessionReducer`)이 **함께 돌 때만** 관찰되는 것들이다.
// 목킹하지 않는다 — 외부 IO가 없다.
//
// 기대값을 이 파일이 지어내지 않는다: 어느 보기가 정답인지의 정본은 계약 §1.4가
// 고정한 `listeningQuestionsByStep`이므로 `questionsForStep`으로 읽어서 누른다.
// 문항 수(3)도 그 목록의 길이에서 온다.

// 여정 탭 → 스텝 tap → 시트 `시작` tap. 시트가 실제로 떠 있는 것을 먼저 앵커로 잡는다 —
// 뒤에 오는 부재 단언(`step-sheet-panel`이 없다)이 공허해지지 않게.
function startStep(stepId: JourneyStepId): void {
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  fireEvent.tap(screen.getByTestId(`journey-step-node-${stepId}`), {});
  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
}

// 문항을 순서대로 전부 응답하고 매번 `다음`을 누른다. `pick`은 그 문항의 정답 인덱스와
// 문항 자리를 받아 **실제로 누를 보기 인덱스**를 돌려준다.
function answerAllQuestions(
  stepId: JourneyStepId,
  pick: (answerIndex: number, questionIndex: number) => number,
): void {
  questionsForStep(stepId).forEach((question, questionIndex) => {
    const choiceIndex = pick(question.answerIndex, questionIndex);

    fireEvent.tap(screen.getByTestId(`listening-choice-${choiceIndex}`), {});
    fireEvent.tap(screen.getByTestId("listening-screen-next"), {});
  });
}

// 정답/오답을 섞는다 (계약 §3.3-3) — 가운데 문항만 정답이 아닌 보기를 고른다.
function mixedPick(answerIndex: number, questionIndex: number): number {
  return questionIndex === 1 ? (answerIndex + 1) % 4 : answerIndex;
}

// 전부 오답 (계약 §3.3-4). 한 스텝 안에서 세 문항의 정답 인덱스가 서로 다르므로
// 고정된 한 인덱스를 계속 누르는 방식은 쓰지 않는다 (계약 §1.4의 불변식).
function incorrectPick(answerIndex: number): number {
  return (answerIndex + 1) % 4;
}

// 계약 §3.3-1 · 수용 기준 2·3: 맵 → 시트 → `시작` → 학습 화면이 활성 스택 최상단.
test("현재 스텝의 시트에서 시작을 tap하면 학습 화면이 맵을 덮고 최상단에 온다", () => {
  render(<App />);

  startStep("ordering");

  expect(screen.getByTestId("listening-screen-title")).toHaveTextContent("3단계 · 듣기");
  expect(screen.getByTestId("listening-screen-progress")).toHaveTextContent("문항 1 / 3");
  expect(screen.queryByTestId("journey-map-screen-title")).not.toBeInTheDocument();
  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
});

// 수용 기준 3의 결선 쪽 관찰: 서로 다른 두 스텝에서 들어가면 화면에 렌더되는 값이
// 갈린다. `stepId`가 union을 타고 화면까지 도달하지 않으면 둘이 같아진다.
// (`greeting`은 done이지만 시트가 열리고 시작된다 — lib-222 §1.5.1)
test("서로 다른 두 스텝에서 시작하면 제목과 문항 텍스트가 갈린다", () => {
  render(<App />);

  startStep("ordering");

  expect(screen.getByTestId("listening-screen-title")).toHaveTextContent("3단계 · 듣기");
  expect(screen.getByTestId("listening-prompt-text")).toHaveTextContent(
    questionsForStep("ordering")[0].prompt,
  );

  fireEvent.tap(screen.getByTestId("listening-screen-exit"), {});
  startStep("greeting");

  expect(screen.getByTestId("listening-screen-title")).toHaveTextContent("1단계 · 듣기");
  expect(screen.getByTestId("listening-prompt-text")).toHaveTextContent(
    questionsForStep("greeting")[0].prompt,
  );
  expect(screen.getByTestId("listening-prompt-text")).not.toHaveTextContent(
    questionsForStep("ordering")[0].prompt,
  );
});

// 계약 §3.3-2 · 수용 기준 2 후반: 학습 화면은 셸을 가리지도 잠그지도 않는다.
// 되돌아왔을 때 화면은 스택에 남고 **세션만** 버려진다는 것을 함께 본다 (§0.2) —
// 그래서 먼저 문항을 하나 넘겨 버려질 로컬 상태를 만든다.
test("학습 화면에서도 탭 넷이 그대로 조작되고, 돌아오면 화면은 남되 문항은 처음부터다", () => {
  render(<App />);
  startStep("ordering");

  expect(screen.getByTestId("bottom-navigator-tab-journey")).toHaveAttribute(
    "data-selected",
    "true",
  );
  expect(screen.getByTestId("bottom-navigator-tab-home")).toBeInTheDocument();
  expect(screen.getByTestId("bottom-navigator-tab-roleplay")).toBeInTheDocument();
  expect(screen.getByTestId("bottom-navigator-tab-settings")).toBeInTheDocument();

  fireEvent.tap(
    screen.getByTestId(`listening-choice-${questionsForStep("ordering")[0].answerIndex}`),
    {},
  );
  fireEvent.tap(screen.getByTestId("listening-screen-next"), {});
  expect(screen.getByTestId("listening-screen-progress")).toHaveTextContent("문항 2 / 3");

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-home"), {});

  expect(screen.getByTestId("home-screen-title")).toHaveTextContent("홈");
  expect(screen.queryByTestId("listening-screen-title")).not.toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});

  expect(screen.getByTestId("listening-screen-title")).toHaveTextContent("3단계 · 듣기");
  expect(screen.getByTestId("listening-screen-progress")).toHaveTextContent("문항 1 / 3");
});

// 계약 §3.3-3 · **수용 기준 8**: 루프 한 판이 진행을 갱신한다.
//
// LIB-227: `onFinishLearning`이 이제 평가 화면으로 `replace`한다
// (.agent-harness/work/lib-227/spec.md §1.8(b)) — `결과 보기` 탭 뒤 곧장 맵이 뜨지
// 않는다. 평가의 `맵으로`를 눌러야 맵에 닿는다. 경로가 길어질 뿐 단언의 끝은
// 같다(같은 계약 §7.6.2).
test("루프 한 판을 마치고 맵으로 돌아오면 그 스텝이 done, 다음이 current다", () => {
  render(<App />);
  startStep("ordering");

  answerAllQuestions("ordering", mixedPick);

  expect(screen.getByTestId("listening-screen-complete")).toHaveTextContent("문항을 모두 마쳤어요");

  fireEvent.tap(screen.getByTestId("listening-screen-finish"), {});
  fireEvent.tap(screen.getByTestId("assessment-screen-exit"), {});

  expect(screen.getByTestId("journey-map-screen-title")).toHaveTextContent("여정 맵");
  expect(screen.getByTestId("journey-step-node-ordering")).toHaveAttribute("data-status", "done");
  expect(screen.getByTestId("journey-step-node-appointment")).toHaveAttribute(
    "data-status",
    "current",
  );
  expect(screen.getByTestId("journey-step-node-directions")).toHaveAttribute(
    "data-status",
    "locked",
  );
});

// (LIB-227 u7) 이 자리에 있던 "전부 오답으로 마쳐도 진행은 같은 결과로 갱신된다"는
// u7이 뒤집은 규칙(*"미통과도 완료를 건다"*)을 그대로 못박고 있어 무효가 됐다
// (.agent-harness/work/lib-227/spec.md §1.4 · §4.3 · §7.6.2). 대체하는 케이스는
// 아래 "LIB-227 — 평가 화면" 절의 I6이다 — 같은 입력(전부 오답)에서 기대가
// 반대로 뒤집힌다: 완료가 걸리지 않고 그 스텝이 여전히 `current`로 남는다.

// 계약 §3.3-5 · **수용 기준 10**: 완료 전 이탈은 진행을 바꾸지 않는다.
// 응답을 하나 남긴 채 나간다 — 아무것도 안 한 채 나가면 "진행이 안 바뀐다"가
// 이탈 때문인지 아무 일도 없었기 때문인지 갈리지 않는다.
test("완료 전에 맵으로 빠지면 진행이 바뀌지 않는다", () => {
  render(<App />);
  startStep("ordering");

  const answerIndex = questionsForStep("ordering")[0].answerIndex;
  fireEvent.tap(screen.getByTestId(`listening-choice-${answerIndex}`), {});
  expect(screen.getByTestId(`listening-choice-${answerIndex}`)).toHaveAttribute(
    "data-result",
    "correct",
  );
  expect(screen.queryByTestId("listening-screen-finish")).not.toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("listening-screen-exit"), {});

  expect(screen.getByTestId("journey-map-screen-title")).toHaveTextContent("여정 맵");
  expect(screen.getByTestId("journey-step-node-ordering")).toHaveAttribute(
    "data-status",
    "current",
  );
  expect(screen.getByTestId("journey-step-node-appointment")).toHaveAttribute(
    "data-status",
    "locked",
  );
});

// 계약 §3.3-6 · 수용 기준 9의 **결선 쪽** 관찰 (순수 함수 쪽은 journey-map.unit.test.ts).
// 진행이 3이 된 뒤 서수 1인 스텝을 다시 돌아도 3에서 줄지 않는다.
// LIB-227: 두 finish 탭 모두 평가 화면을 거친다 — 각 탭 뒤에 평가의 `맵으로`를 눌러야
// 다음 단언(맵의 스텝 상태)에 닿는다.
test("이미 마친 스텝을 다시 돌아도 진행이 되돌아가지 않는다", () => {
  render(<App />);
  startStep("ordering");
  answerAllQuestions("ordering", mixedPick);
  fireEvent.tap(screen.getByTestId("listening-screen-finish"), {});
  fireEvent.tap(screen.getByTestId("assessment-screen-exit"), {});
  expect(screen.getByTestId("journey-step-node-appointment")).toHaveAttribute(
    "data-status",
    "current",
  );

  startStep("greeting");
  expect(screen.getByTestId("listening-screen-title")).toHaveTextContent("1단계 · 듣기");
  answerAllQuestions("greeting", mixedPick);
  fireEvent.tap(screen.getByTestId("listening-screen-finish"), {});
  fireEvent.tap(screen.getByTestId("assessment-screen-exit"), {});

  expect(screen.getByTestId("journey-step-node-greeting")).toHaveAttribute("data-status", "done");
  expect(screen.getByTestId("journey-step-node-ordering")).toHaveAttribute("data-status", "done");
  expect(screen.getByTestId("journey-step-node-appointment")).toHaveAttribute(
    "data-status",
    "current",
  );
});

// 계약 §3.3-7: 두 경로(완료 · 중도 이탈) 모두 시트가 닫힌 채로 돌아온다.
// `JourneyMapScreen`이 언마운트되며 시트 상태가 버려지는 것의 결과다 (§1.7).
// 맵 제목을 함께 읽어 "맵이 떠 있는데 시트만 없다"를 본다 — 부재만 보면 화면이
// 통째로 비어도 통과한다.
// LIB-227: 완료 경로는 평가 화면을 거친다 — 평가의 `맵으로`까지 눌러야 맵에 닿는다.
test("완료로 돌아와도 중도 이탈로 돌아와도 시트는 닫혀 있다", () => {
  render(<App />);
  startStep("ordering");
  answerAllQuestions("ordering", mixedPick);
  fireEvent.tap(screen.getByTestId("listening-screen-finish"), {});
  fireEvent.tap(screen.getByTestId("assessment-screen-exit"), {});

  expect(screen.getByTestId("journey-map-screen-title")).toHaveTextContent("여정 맵");
  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();

  startStep("appointment");
  fireEvent.tap(screen.getByTestId("listening-screen-exit"), {});

  expect(screen.getByTestId("journey-map-screen-title")).toHaveTextContent("여정 맵");
  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
});

// 계약 §3.3-8: 잠긴 스텝에서는 시작할 수 없다 (lib-222 §1.7.2가 여전히 유효하다는
// 회귀 단언). 잠김이라는 것을 먼저 읽어 앵커로 삼는다.
test("잠긴 스텝을 tap하면 시트도 학습 화면도 뜨지 않는다", () => {
  render(<App />);
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  expect(screen.getByTestId("journey-step-node-directions")).toHaveAttribute(
    "data-status",
    "locked",
  );

  fireEvent.tap(screen.getByTestId("journey-step-node-directions"), {});

  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
  expect(screen.queryByTestId("listening-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("journey-map-screen-title")).toHaveTextContent("여정 맵");
});

// **수용 기준 11의 실행 가능한 절반.** "storage를 import·호출하지 않는다"는 diff·grep의
// 몫이지만(계약 §3.5), 그 결과로 관찰되는 사실 — **진행이 App 인스턴스 밖으로 나가지
// 않는다** — 은 여기서 실행 가능하다. 진행을 3으로 만든 뒤 앱을 통째로 내리고 다시
// 띄운다. 어딘가에 영속됐다면 새 인스턴스가 3을 복원해 여기서 갈린다.
// (실기의 "앱 재시작 후 초기값 복귀"는 이 단언의 대체가 아니라 나머지 절반이다)
// LIB-227: 완료를 확인하려면 평가의 맵으로까지 눌러야 맵의 스텝 상태를 읽을 수 있다.
test("진행이 영속되지 않는다 — 앱을 다시 띄우면 초기 진행으로 돌아온다", () => {
  render(<App />);
  startStep("ordering");
  answerAllQuestions("ordering", mixedPick);
  fireEvent.tap(screen.getByTestId("listening-screen-finish"), {});
  fireEvent.tap(screen.getByTestId("assessment-screen-exit"), {});
  expect(screen.getByTestId("journey-step-node-ordering")).toHaveAttribute("data-status", "done");

  cleanup();
  render(<App />);
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});

  expect(screen.getByTestId("journey-step-node-ordering")).toHaveAttribute(
    "data-status",
    "current",
  );
  expect(screen.getByTestId("journey-step-node-appointment")).toHaveAttribute(
    "data-status",
    "locked",
  );
});

// -------------------------------------------------------------------------
// LIB-227 — 평가 화면. 계약(.agent-harness/work/lib-227/spec.md) §4.3의 I1~I6을
// 여기서 검증한다. `App` · `navReducer`(`replace`) · `JourneyMapScreen` ·
// `ListeningScreen` · `AssessmentScreen`이 실제로 맞물릴 때만 보이는 것들이다 —
// `Screen` union 확장 · `replace` 결선 · 듣기에서 평가로 넘어가는 데이터 · **판정이
// 진행에 닿는 자리**(u7)는 `ui`가 못 본다(계약 §7.3). 목킹하지 않는다.
//
// 기존 케이스는 하나도 지우지 않는다 — 다만 `:313` 부근에 있던 구 "전부 오답으로
// 마쳐도 진행은 같은 결과로 갱신된다"는 u7이 뒤집은 규칙을 못박고 있어 무효가 됐고,
// 아래 I6이 그 자리를 대체한다(계약 §4.3 · §7.6.2).

// I1 · 수용 기준 1 주 판정자: 마지막 문항 뒤 `결과 보기`를 누르면 평가 화면이 뜬다.
// `mixedPick`은 가운데 문항만 오답이라 2/3 — `minCorrectCount: 2`에서 정확히
// 통과 경로다(계약 §1.4의 경계 주석).
test("I1: 문항 셋을 통과 경로로 마치고 결과 보기를 누르면 평가 화면이 뜨고 제목이 그 스텝의 서수다", () => {
  render(<App />);
  startStep("ordering");

  answerAllQuestions("ordering", mixedPick);
  fireEvent.tap(screen.getByTestId("listening-screen-finish"), {});

  expect(screen.getByTestId("assessment-screen-title")).toHaveTextContent("3단계 · 평가");
  expect(screen.queryByTestId("listening-screen-title")).not.toBeInTheDocument();
});

// I2: 문항 행 N개의 data-result가 실제로 고른 보기의 정오와 일치한다 — 듣기의 이력이
// 평가까지 온다. `mixedPick`은 인덱스 1만 오답이다.
test("I2: 평가의 문항 행 data-result가 실제로 고른 보기의 정오와 일치한다", () => {
  render(<App />);
  startStep("ordering");
  answerAllQuestions("ordering", mixedPick);
  fireEvent.tap(screen.getByTestId("listening-screen-finish"), {});

  expect(screen.getByTestId("assessment-item-0")).toHaveAttribute("data-result", "correct");
  expect(screen.getByTestId("assessment-item-1")).toHaveAttribute("data-result", "incorrect");
  expect(screen.getByTestId("assessment-item-2")).toHaveAttribute("data-result", "correct");
});

// I3: 평가의 `맵으로`가 `back` 하나로 맵에 닿는다 — `replace` 결선의 증거다. `push`였다면
// `back` 한 번의 목적지가 듣기 화면이었을 것이다(계약 §1.8(b)).
test("I3: 평가의 맵으로를 누르면 back 하나로 맵에 닿는다", () => {
  render(<App />);
  startStep("ordering");
  answerAllQuestions("ordering", mixedPick);
  fireEvent.tap(screen.getByTestId("listening-screen-finish"), {});
  expect(screen.getByTestId("assessment-screen-title")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("assessment-screen-exit"), {});

  expect(screen.getByTestId("journey-map-screen-title")).toHaveTextContent("여정 맵");
  expect(screen.queryByTestId("assessment-screen-title")).not.toBeInTheDocument();
  expect(screen.queryByTestId("listening-screen-title")).not.toBeInTheDocument();
});

// I4 · 수용 기준 4 앞쪽 절반: 통과가 완료를 걸었다 — u7 전에는 "듣기가 걸었다"였다.
test("I4: 통과 뒤 맵으로 돌아오면 그 스텝이 done이고 다음이 current다", () => {
  render(<App />);
  startStep("ordering");
  answerAllQuestions("ordering", mixedPick);
  fireEvent.tap(screen.getByTestId("listening-screen-finish"), {});
  fireEvent.tap(screen.getByTestId("assessment-screen-exit"), {});

  expect(screen.getByTestId("journey-step-node-ordering")).toHaveAttribute("data-status", "done");
  expect(screen.getByTestId("journey-step-node-appointment")).toHaveAttribute(
    "data-status",
    "current",
  );
});

// I5: 중도 이탈에는 평가가 없다 — 문항 하나만 응답하고 헤더 `맵으로`로 나가면 진행이
// 안 바뀌고 평가 화면 자체가 뜨지 않는다.
test("I5: 문항 하나만 응답하고 헤더 맵으로 나가면 진행이 안 바뀌고 평가가 뜨지 않는다", () => {
  render(<App />);
  startStep("ordering");

  const answerIndex = questionsForStep("ordering")[0].answerIndex;
  fireEvent.tap(screen.getByTestId(`listening-choice-${answerIndex}`), {});

  fireEvent.tap(screen.getByTestId("listening-screen-exit"), {});

  expect(screen.getByTestId("journey-map-screen-title")).toHaveTextContent("여정 맵");
  expect(screen.queryByTestId("assessment-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("journey-step-node-ordering")).toHaveAttribute(
    "data-status",
    "current",
  );
  expect(screen.getByTestId("journey-step-node-appointment")).toHaveAttribute(
    "data-status",
    "locked",
  );
});

// I6 (u7) · 수용 기준 4 뒤쪽 절반 · 주 판정자. `App.integration.test.tsx`에 있던 구
// 케이스("전부 오답으로 마쳐도 진행은 같은 결과로 갱신된다")가 u7로 뒤집혀 이 케이스가
// 그 자리를 대체한다(계약 §4.3 · §7.6.2). 셋을 한 흐름에서 본다: (1) 판정이
// `data-verdict="failed"`다 (2) 맵의 그 스텝이 여전히 `current`이고 다음이 `locked`
// 그대로다 — 진행이 안 늘었다 (3) 그 노드를 다시 눌러 시트의 `시작`으로 듣기에 다시
// 들어갈 수 있다(계약 §1.8.1이 코드로 확인한 경로). `incorrectPick`은 0/3이라
// `minCorrectCount: 2`에서 확실히 미통과다.
test("I6: 미통과면 완료가 안 걸리고 맵의 그 스텝이 여전히 current로 남아 다시 들어갈 수 있다", () => {
  render(<App />);
  startStep("ordering");

  answerAllQuestions("ordering", incorrectPick);
  fireEvent.tap(screen.getByTestId("listening-screen-finish"), {});

  expect(screen.getByTestId("assessment-screen-verdict")).toHaveAttribute("data-verdict", "failed");

  fireEvent.tap(screen.getByTestId("assessment-screen-exit"), {});

  expect(screen.getByTestId("journey-map-screen-title")).toHaveTextContent("여정 맵");
  expect(screen.getByTestId("journey-step-node-ordering")).toHaveAttribute(
    "data-status",
    "current",
  );
  expect(screen.getByTestId("journey-step-node-appointment")).toHaveAttribute(
    "data-status",
    "locked",
  );

  fireEvent.tap(screen.getByTestId("journey-step-node-ordering"), {});
  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});

  expect(screen.getByTestId("listening-screen-title")).toHaveTextContent("3단계 · 듣기");
  expect(screen.getByTestId("listening-screen-progress")).toHaveTextContent("문항 1 / 3");
});

// -------------------------------------------------------------------------
// LIB-223 오디오 축 — 계약 §9.9(e) · §9.6-2·6·7·8 · §9.7의 경계표.
//
// **`ui`가 원리적으로 볼 수 없는 것만 여기에 쓴다.** `ListeningPrompt.ui.test.tsx`와
// `ListeningScreen.ui.test.tsx`는 컴포넌트를 고립 렌더하고 `unmount()`를 **손으로**
// 부른다 — 그것은 "cleanup이 stop을 부른다"의 판정이지 "**출구·완료·탭 전환이 실제로
// 언마운트를 일으킨다**"의 판정이 아니다. 언마운트를 일으키는 주체는 `App`이고,
// 그 결선은 이 계층에서만 관찰된다 (계약 §9.7의 3번째 행).
//
// **`lib/audio.ts`를 `vi.mock`하지 않는다.** 그 파일이 세대(generation)로 늦게 온 완료를
// 버리고 모듈 부재를 흡수하는데, 모듈을 통째로 대역으로 바꾸면 그 가드가 자동 계층에서
// 사라지고 아래의 「대역 없이도 돈다」가 진짜 경로가 아니게 된다 (계약 §9.3-2).
// 대역을 두는 자리는 **호스트 경계 하나**이고, 형태의 정본은 `src/lib/audio.unit.test.ts`의
// `stubHost()`다 (계약 §9.9(a)·(c)와 같은 형태).
//
// **기대값을 이 파일이 지어내지 않는다** — `audioSource`의 정본은 계약 §9.4가 고정한
// `listeningQuestionsByStep`이므로 `questionsForStep`으로 읽는다. 위쪽 스무 케이스가
// `answerIndex`를 읽는 것과 같은 규칙이다.

const STOP = "<stop>";

type HostCall = { source: string; done: (result: unknown) => void };

// 없던 전역(`NativeModules`)을 세운다. `play`와 `stop`을 **한 배열에** 적는다 —
// 이 계층이 보는 것이 바로 둘의 **상대 순서**이기 때문이다 (stop 뒤 새 play).
// `stop` 호출은 `source: "<stop>"` 로 표시한다. 실제 `audioSource`에는 `<`·`>`가 없다
// (계약 §9.4의 불변식).
function stubHost(): HostCall[] {
  const calls: HostCall[] = [];
  const mod = {
    play: (source: string, done: (result: unknown) => void) => void calls.push({ source, done }),
    stop: () => void calls.push({ source: STOP, done: () => {} }),
  };
  vi.stubGlobal("NativeModules", { AudioPlaybackModule: mod });
  return calls;
}

const sourcesOf = (calls: readonly HostCall[]): string[] => calls.map((call) => call.source);

const playSources = (calls: readonly HostCall[]): string[] =>
  calls.filter((call) => call.source !== STOP).map((call) => call.source);

const stopCount = (calls: readonly HostCall[]): number =>
  calls.filter((call) => call.source === STOP).length;

// 값의 정본은 데이터다 — 리터럴("ordering-1")을 적으면 이 파일이 두 번째 정본이 된다.
const audioSourceAt = (stepId: JourneyStepId, index: number): string =>
  questionsForStep(stepId)[index].audioSource;

// 전역 대역을 **테스트마다 원상복구한다.** 지우지 않으면 대역이 다른 테스트 파일로
// 새고, **대역 없이 도는 위쪽 스무 케이스가 먼저 빨개진다** (계약 §9.9(e)-5).
afterEach(() => {
  vi.unstubAllGlobals();
});

// 계약 §9.9(e)-1 · §9.7 첫 행의 **결선 쪽** 절반. `ui`는 `ListeningScreen`에 `stepId`를
// 손으로 넘겨 렌더하지만, 여기서는 **맵의 노드 tap → 시트 → `시작`** 이 그 값을
// 실어 나른다. 중간 어디서 stepId가 상수로 굳으면 여기서만 갈린다.
test("맵 → 시트 → 시작이면 그 스텝의 첫 문항 audioSource로 play가 불린다", () => {
  const calls = stubHost();
  render(<App />);

  startStep("ordering");

  expect(sourcesOf(calls)).toEqual([audioSourceAt("ordering", 0)]);
  expect(stopCount(calls)).toBe(0);
});

// 같은 것의 짝 — **서로 다른 두 스텝에서 값이 갈린다.** 한 스텝의 source가 박혀 있으면
// 위 단언은 통과하고 이것만 죽는다. 두 값이 애초에 다르다는 것도 앵커로 함께 읽는다
// (같으면 아래 단언이 공허해진다).
test("서로 다른 두 스텝에서 시작하면 play의 source가 그 스텝 것으로 갈린다", () => {
  const calls = stubHost();
  render(<App />);

  startStep("ordering");
  expect(sourcesOf(calls)).toEqual([audioSourceAt("ordering", 0)]);

  fireEvent.tap(screen.getByTestId("listening-screen-exit"), {});
  startStep("greeting");

  expect(audioSourceAt("greeting", 0)).not.toBe(audioSourceAt("ordering", 0));
  expect(sourcesOf(calls)).toEqual([
    audioSourceAt("ordering", 0),
    STOP,
    audioSourceAt("greeting", 0),
  ]);
});

// 계약 §9.6-2 — **App을 통과한 실제 흐름에서** 문항이 넘어간다. `ui`는 `rerender`로
// prop을 갈아 끼워 이 순서를 봤다. 여기서는 보기 tap → `다음` tap이 세션 리듀서를
// 지나 `question.audioSource`를 바꾸는 것까지가 관찰 대상이다.
test("다음으로 문항을 넘기면 stop 뒤 새 source로 play가 불린다", () => {
  const calls = stubHost();
  render(<App />);
  startStep("ordering");

  fireEvent.tap(
    screen.getByTestId(`listening-choice-${questionsForStep("ordering")[0].answerIndex}`),
    {},
  );
  fireEvent.tap(screen.getByTestId("listening-screen-next"), {});

  expect(screen.getByTestId("listening-screen-progress")).toHaveTextContent("문항 2 / 3");
  expect(sourcesOf(calls)).toEqual([
    audioSourceAt("ordering", 0),
    STOP,
    audioSourceAt("ordering", 1),
  ]);
});

// 계약 §9.9(e)-2 · §9.6-7 — **`맵으로`(중도 이탈)가 화면을 언마운트한다.**
// `onExit`이 화면을 스택에서 걷지 않고 맵을 그 위에 얹기만 해도 `ui`는 전부 green이다.
// 맵이 실제로 떠 있는 것을 함께 읽어 "화면이 통째로 비었다"와 갈라 놓는다.
test("맵으로(중도 이탈)로 나가면 stop이 불리고 맵으로 돌아온다", () => {
  const calls = stubHost();
  render(<App />);
  startStep("ordering");
  expect(stopCount(calls)).toBe(0);

  fireEvent.tap(screen.getByTestId("listening-screen-exit"), {});

  expect(screen.getByTestId("journey-map-screen-title")).toHaveTextContent("여정 맵");
  expect(screen.queryByTestId("listening-prompt-playback")).not.toBeInTheDocument();
  expect(sourcesOf(calls)).toEqual([audioSourceAt("ordering", 0), STOP]);
});

// 계약 §9.9(e)-3 · §9.6-6·7 — 완료 뒤 `맵으로 돌아가기`.
//
// **계약의 문구는 "`맵으로 돌아가기` tap → `stop`이 불린다"지만, 그 tap 자체는 `stop`을
// 부르지 않는다.** 완료 시점에 `question === null`이 되어 `ListeningPrompt`가 이미
// 언마운트됐고 cleanup이 그때 `stop`을 불렀기 때문이다 (§9.6-6이 §9.6-7보다 **먼저**
// 온다). 그래서 이 테스트는 tap 시점에 호출 하나가 더 얹히는지를 묻지 않고,
// **맵으로 돌아온 시점에 멎지 않은 재생이 하나도 남아 있지 않은지**를 묻는다 —
// 그것이 §9.6이 지키려던 사실(*화면을 떠나면 소리가 계속 나지 않는다*)이다.
// tap이 새 `play`를 만들어 내지 않는다는 것도 함께 못박는다.
// LIB-227: `결과 보기` 탭 뒤 평가 화면이 뜬다 — 평가 화면은 오디오를 전혀 만지지
// 않으므로(계약 §1.1 "문항 데이터를 읽지 않는다") 마운트돼도 재생 호출이 늘지 않는다.
// 그 사실을 평가의 맵으로를 누르기 **전에** 먼저 확인하고, 맵에 닿은 뒤에도 다시
// 확인한다 — 경로가 늘 뿐 "멎지 않은 재생이 남지 않는다"의 뜻은 그대로다.
test("완료 후 맵으로 돌아가기로 나가면 멎지 않은 재생이 남지 않는다", () => {
  const calls = stubHost();
  render(<App />);
  startStep("ordering");

  answerAllQuestions("ordering", mixedPick);

  expect(screen.getByTestId("listening-screen-complete")).toHaveTextContent("문항을 모두 마쳤어요");
  const atComplete = sourcesOf(calls);
  expect(atComplete).toEqual([
    audioSourceAt("ordering", 0),
    STOP,
    audioSourceAt("ordering", 1),
    STOP,
    audioSourceAt("ordering", 2),
    STOP,
  ]);

  fireEvent.tap(screen.getByTestId("listening-screen-finish"), {});

  expect(screen.getByTestId("assessment-screen-title")).toBeInTheDocument();
  expect(sourcesOf(calls)).toEqual(atComplete);

  fireEvent.tap(screen.getByTestId("assessment-screen-exit"), {});

  expect(screen.getByTestId("journey-map-screen-title")).toHaveTextContent("여정 맵");
  expect(sourcesOf(calls)).toEqual(atComplete);
  expect(playSources(calls)).toHaveLength(stopCount(calls));
});

// 계약 §9.9(e)-4 · §9.6-8 — **셸 전환에서도 소리가 멈춘다.**
// `ui`가 **원리적으로** 못 보는 경로다: 탭은 `BottomNavigator`가 dispatch하고 화면을
// 걷는 것은 `App`이라, 컴포넌트를 고립 렌더하는 층에는 이 경로 자체가 없다.
// 돌아왔을 때 세션이 버려져 문항 1부터 다시 트는 것까지 이어서 본다 — `stop`만 보면
// "떠날 때 멈춘다"와 "다시는 안 튼다"가 갈리지 않는다.
test("학습 화면에서 탭을 바꾸면 stop이 불리고, 돌아오면 첫 문항으로 다시 튼다", () => {
  const calls = stubHost();
  render(<App />);
  startStep("ordering");
  expect(stopCount(calls)).toBe(0);

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-home"), {});

  expect(screen.getByTestId("home-screen-title")).toHaveTextContent("홈");
  expect(screen.queryByTestId("listening-prompt-playback")).not.toBeInTheDocument();
  expect(sourcesOf(calls)).toEqual([audioSourceAt("ordering", 0), STOP]);

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});

  expect(screen.getByTestId("listening-screen-progress")).toHaveTextContent("문항 1 / 3");
  expect(sourcesOf(calls)).toEqual([
    audioSourceAt("ordering", 0),
    STOP,
    audioSourceAt("ordering", 0),
  ]);
});

// 계약 §9.9(e)-5 · §9.3-2의 **회귀 단언**. 위쪽 스무 케이스가 전부 대역 없이 도는 것이
// 이미 이 사실을 지고 있지만, **이름으로 한 번 못박는다** — 그것들은 오디오를 모르고
// 죽어도 다른 것을 가리키기 때문이다.
//
// `NativeModules` 전역이 **아예 없는** 환경이다. `lib/audio.ts`의 `typeof` 가드가
// 빠지면 맨 식별자 접근에서 ReferenceError가 나고 렌더 경로가 통째로 죽는다.
// 화면이 「재생 중」으로 보이지 않는 것(`듣기`에 머문다)도 함께 본다 — 모듈이 없는데
// `멈춤`에 갇히면 고장이 정상인 척한다 (계약 §9.7).
//
// LIB-227: 완료 뒤 평가 화면이 뜬다. 평가 화면은 마운트 때 `announce`를 부르고
// (.agent-harness/work/lib-227/spec.md §3.3), `lib/accessibility.ts`의
// `typeof NativeModules === "undefined"` 가드가 그 호출을 받아 던지지 않는다(같은
// 계약 §3.2 규칙 1·5) — 이 케이스가 그 가드가 실제로 일하는지를 보는 자리가 됐다.
// 경로만 늘리고 판정은 그대로 "던지지 않는다"와 "맵에서 done"이다.
test("대역이 없어도 루프 한 판이 끝까지 돌고 재생 조작이 '듣기'에 머문다", () => {
  // 이 파일의 마지막 케이스다 — 앞의 여섯이 세운 대역이 `afterEach`에서 실제로 걷혔는지를
  // 여기서 한 줄로 못박는다. 새면 위쪽 스무 케이스가 「모듈이 없는 환경」을 더 이상 돌지
  // 않게 되고, §9.3-2 가드의 회귀 단언이 조용히 공허해진다.
  expect(typeof NativeModules).toBe("undefined");

  render(<App />);

  startStep("ordering");

  const playback = () => screen.getByTestId("listening-prompt-playback");
  expect(playback()).toHaveAttribute("accessibility-label", "듣기");

  // 눌러도 던지지 않고 상태가 움직이지 않는다 — 아무 일도 일어나지 않는 것이 정상이다.
  expect(() => fireEvent.tap(playback(), {})).not.toThrow();
  expect(playback()).toHaveAttribute("accessibility-label", "듣기");

  expect(() => answerAllQuestions("ordering", mixedPick)).not.toThrow();

  expect(screen.getByTestId("listening-screen-complete")).toHaveTextContent("문항을 모두 마쳤어요");

  expect(() => fireEvent.tap(screen.getByTestId("listening-screen-finish"), {})).not.toThrow();
  expect(screen.getByTestId("assessment-screen-title")).toBeInTheDocument();

  expect(() => fireEvent.tap(screen.getByTestId("assessment-screen-exit"), {})).not.toThrow();

  expect(screen.getByTestId("journey-map-screen-title")).toHaveTextContent("여정 맵");
  expect(screen.getByTestId("journey-step-node-ordering")).toHaveAttribute("data-status", "done");
});

// -------------------------------------------------------------------------
// LIB-226 — 스크롤 영역 규약. 계약 §3.3(I1·I2)을 여기서 검증한다.
//
// **왜 `integration`인가.** 탭 전환·스택 진입을 거쳐 여섯 화면 전부에서 스크롤
// 컨테이너를 확인하는 것은 단일 컴포넌트를 고립 렌더해서는 성립하지 않는다 —
// `App` · `navReducer` · `BottomNavigator` · 화면 여섯의 협력이다
// (계약 test.integration.applicability 사유). 목킹하지 않는다 — 외부 IO가 없다.
//
// **왜 이 자리에 두는가.** 이 이슈의 위험은 한 화면의 버그가 아니라 **부분
// 적용**이다 — ADR-0020 D5에서 같은 모양 여섯 곳이 남았고 우리가 아니라 다른
// 세션이 실측해 찾아냈다(요구사항 결정 1). 다음번에는 실측이 아니라 이
// 케이스가 찾는다. 화면이 스물 몇 개로 늘 때 여기에 행을 더하는 것이 규약을
// 유지하는 값싼 방법이다.
//
// **`integration`이 못 보는 것은 `ui`와 같다** — jsdom에는 레이아웃이 없다.
// 여기서 단언하는 것은 "스크롤 컨테이너가 testid로 존재/부재한다"까지다.
// 실제로 스크롤되는가·고정이 지켜지는가는 실기(e2e)의 것이다(계약 §3.2 말미).

// 계약 §3.3 I1 · 수용 기준 3(다섯 화면 **전부**): 탭 넷을 순회하며 각 화면에
// 스크롤 컨테이너가 하나씩 있는지 본다. 화면을 옮길 때마다 이전 화면의 스크롤
// 컨테이너가 사라지는 것도 함께 본다 — "어딘가에 하나 있다"가 아니라 "그
// 화면의 것이 있다"를 확인하기 위해서다.
test("탭 넷을 순회하며 각 화면에 스크롤 컨테이너가 하나씩 있다", () => {
  render(<App />);

  expect(screen.getByTestId("home-screen-scroll")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  expect(screen.getByTestId("journey-map-screen-scroll")).toBeInTheDocument();
  expect(screen.queryByTestId("home-screen-scroll")).not.toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-roleplay"), {});
  expect(screen.getByTestId("roleplay-list-screen-scroll")).toBeInTheDocument();
  expect(screen.queryByTestId("journey-map-screen-scroll")).not.toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-settings"), {});
  expect(screen.getByTestId("settings-screen-scroll")).toBeInTheDocument();
  expect(screen.queryByTestId("roleplay-list-screen-scroll")).not.toBeInTheDocument();
});

// 계약 §3.3 I2: 탭 스택이 아니라 **스택에 쌓인 화면**에도 스크롤 컨테이너가
// 있는지 본다 — 여정 맵 → 스텝 tap → 시트 `시작` → 듣기 화면. `startStep`은
// 위쪽 LIB-223 절이 정의한 것을 그대로 재사용한다(함수 선언은 호이스팅된다).
test("탭이 아니라 스택에 쌓인 화면(듣기)에도 스크롤 컨테이너가 있다", () => {
  render(<App />);

  startStep("ordering");

  expect(screen.getByTestId("listening-screen-scroll")).toBeInTheDocument();
  expect(screen.queryByTestId("journey-map-screen-scroll")).not.toBeInTheDocument();
});

// 계약 §3.3 I3의 회귀 절반: 여정 맵 화면도 스크롤 컨테이너를 갖는다는 것을
// 시트가 열려도 그대로 유지한다 — 시트는 스크롤 밖(계약 R9)이므로 시트가
// 열려도 맵의 스크롤 컨테이너는 사라지지 않는다.
test("시트가 열려 있어도 여정 맵의 스크롤 컨테이너는 그대로다", () => {
  render(<App />);
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  expect(screen.getByTestId("journey-map-screen-scroll")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("journey-step-node-ordering"), {});

  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
  expect(screen.getByTestId("journey-map-screen-scroll")).toBeInTheDocument();
});
