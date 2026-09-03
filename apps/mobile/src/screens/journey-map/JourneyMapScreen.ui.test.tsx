import { expect, test } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { JourneyMapScreen } from "./JourneyMapScreen";
import { completedStepCount, journeySteps, stepStatusAt } from "./journey-map";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4).
// 이 화면은 제목 텍스트 하나만 그린다 — 탭 라벨(`여정`)과 화면 제목(`여정 맵`)은
// 다르다 (screens.contract.ts).
test("여정 맵 화면이 제목을 렌더한다", () => {
  render(<JourneyMapScreen />);

  expect(screen.getByTestId("journey-map-screen-title")).toHaveTextContent("여정 맵");
});

// 재고정 2026-09-02: 제목 다섯이 같은 방식으로 heading이 된다 (screens.contract.ts).
test("여정 맵 화면 제목이 accessibility-traits header를 갖는다", () => {
  render(<JourneyMapScreen />);

  expect(screen.getByTestId("journey-map-screen-title")).toHaveAttribute(
    "accessibility-traits",
    "header",
  );
});

// ---------------------------------------------------------------- 계약 §3.2(c) 단언 7~13
// (여기부터 추가분. 기존 두 테스트는 위에서 한 글자도 바뀌지 않았다.)
// `toHaveClass` · `toHaveStyle` · `toBeVisible`을 쓰지 않는다. 텍스트 질의(`getByText`)를
// 쓰지 않는다 — 화면 제목과 탭 라벨이 같은 문자열을 공유하는 조합이 있어 모호하다.

// 단언 7: 스텝 다섯이 전부 렌더되고 각자 data-status가 §1.4 표와 같다.
test("스텝 다섯이 전부 렌더되고 각자 data-status가 파생 상태와 같다", () => {
  render(<JourneyMapScreen />);

  journeySteps.forEach((step, index) => {
    const expectedStatus = stepStatusAt(index, completedStepCount);

    expect(screen.getByTestId(`journey-step-node-${step.id}`)).toHaveAttribute(
      "data-status",
      expectedStatus,
    );
  });
});

// 단언 8: 처음에는 step-sheet-panel이 없다.
test("처음에는 시트가 렌더되지 않는다", () => {
  render(<JourneyMapScreen />);

  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
});

// 단언 9: journey-step-node-ordering을 tap하면 시트가 나타나고 그 스텝의 정보를 낸다.
test("스텝을 tap하면 시트가 열리고 그 스텝의 제목·설명을 낸다", () => {
  render(<JourneyMapScreen />);

  fireEvent.tap(screen.getByTestId("journey-step-node-ordering"), {});

  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
  expect(screen.getByTestId("step-sheet-title")).toHaveTextContent("주문하기");
  expect(screen.getByTestId("step-sheet-description")).toHaveTextContent(
    "카페에서 마실 것을 주문한다",
  );
});

// 단언 10: step-sheet-close를 tap하면 시트가 사라지고 화면 제목은 그대로다.
test("닫기를 tap하면 시트가 사라지고 화면 제목은 그대로다", () => {
  render(<JourneyMapScreen />);

  fireEvent.tap(screen.getByTestId("journey-step-node-ordering"), {});
  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("step-sheet-close"), {});

  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
  expect(screen.getByTestId("journey-map-screen-title")).toHaveTextContent("여정 맵");
});

// 단언 11: 시트가 열린 상태에서 다른 스텝을 tap하면 시트가 그 스텝으로 바뀐다
// (제목이 갈린다. 시트가 둘이 되지 않는다).
test("시트가 열린 채 다른 스텝을 tap하면 시트가 그 스텝으로 바뀐다", () => {
  render(<JourneyMapScreen />);

  fireEvent.tap(screen.getByTestId("journey-step-node-ordering"), {});
  expect(screen.getByTestId("step-sheet-title")).toHaveTextContent("주문하기");

  fireEvent.tap(screen.getByTestId("journey-step-node-greeting"), {});

  expect(screen.getAllByTestId("step-sheet-panel")).toHaveLength(1);
  expect(screen.getByTestId("step-sheet-title")).toHaveTextContent("첫 인사");
});

// 단언 12 (재고정, 계약 §1.7.2·§4.4·§4.3.3): journey-step-node-appointment(잠김)를 tap해도
// 시트가 열리지 않는다. 부재 단언은 code.md의 표대로 queryByTestId + not.toBeInTheDocument.
// 계약 §1.7.2 「함께 고정하는 것」 3: 잠긴 스텝은 애초에 시트를 열지 않으므로 맵 컨테이너의
// accessibility-elements-hidden도 움직이지 않는다 — 같은 tap 하나가 낸 결과를 시트의
// 부재와 맵의 가림 여부 두 채널로 함께 본다. 형태는 단언 14~16과 같다.
test("잠긴 스텝을 tap해도 시트가 열리지 않는다", () => {
  render(<JourneyMapScreen />);

  fireEvent.tap(screen.getByTestId("journey-step-node-appointment"), {});

  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
  expect(screen.getByTestId("journey-map-screen-map")).toHaveAttribute(
    "accessibility-elements-hidden",
    "false",
  );
});

// 단언 12-b (계약 §1.7.2 "아무 일도 일어나지 않는다"의 나머지 절반): 열려 있던 시트가
// 있으면 잠긴 스텝의 tap이 그 시트를 닫는 수단도 되지 않는다 — 그대로 열려 있다.
test("시트가 열린 채로 잠긴 스텝을 tap해도 시트는 그대로 열려 있다", () => {
  render(<JourneyMapScreen />);

  fireEvent.tap(screen.getByTestId("journey-step-node-ordering"), {});
  expect(screen.getByTestId("step-sheet-title")).toHaveTextContent("주문하기");

  fireEvent.tap(screen.getByTestId("journey-step-node-appointment"), {});

  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
  expect(screen.getByTestId("step-sheet-title")).toHaveTextContent("주문하기");
});

// 단언 13: step-sheet-start를 tap해도 시트가 그대로 열려 있다 — 무동작 계약.
test("시작을 tap해도 시트가 그대로 열려 있다 — 무동작 계약", () => {
  render(<JourneyMapScreen />);

  fireEvent.tap(screen.getByTestId("journey-step-node-ordering"), {});
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});

  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
  expect(screen.getByTestId("step-sheet-title")).toHaveTextContent("주문하기");
});

// ---------------------------------------------------------------- 계약 §3.2(c) 단언 14~16 (보정, u18)
// §1.7.1 겹침 계약 — 이 시트는 비모달이고, 맵은 가리되 탭 바는 가리지 않는다.
// `journey-map-screen-map` 하나를 세 시점(닫힘 · 열림 · 다시 닫힘)에 읽는다.
//
// 값의 형태는 §1.7.1이 고정한 대로다 — accessibility-elements-hidden은 시트가 닫혀
// 있을 때도 "붙지 않는" 것이 아니라 언제나 붙고 값만 "false"/"true"로 갈린다
// (BottomNavigator.ui.test.tsx의 accessibility-elements-hidden/data-selected 단언과
// 같은 형태). 조건부로 속성을 빼는 형태였다면 이 세 테스트는 다른 모양이었을 것이다.
//
// "false"라는 문자열 자체가 핵심이 아니라 이 형태(언제나 붙는다)가 핵심이다 — 실제
// 직렬화가 다르게 나오면 문자열만 고치고 형태는 유지한다(§3.2(c) 보정 문단).
//
// 탭 바(BottomNavigator)는 여기서 단언하지 않는다 — 이 파일은 JourneyMapScreen만
// 고립 렌더하므로 탭 바가 트리에 없다. "시트가 열린 동안에도 탭 전환이 동작한다"는
// App.integration.test.tsx 5번이 이미 단언하고 통과 중이다.
//
// 이 세 단언이 고정하는 것은 "속성이 붙었다"까지다. accessibility-elements-hidden이
// 서브트리 전체에 실제로 먹는지, 닫은 뒤 실제로 보조기술에서 복원되는지는 이 저장소의
// jsdom 기반 `ui` 계층에서 확인된 바 없다 — 실기가 판정한다
// (ADR-0016 D6, docs/e2e/journey-map.md E1-a/b/c).

// 단언 14: 닫혀 있을 때 맵이 가려져 있지 않다.
test("시트가 닫혀 있을 때 맵의 accessibility-elements-hidden은 false다", () => {
  render(<JourneyMapScreen />);

  expect(screen.getByTestId("journey-map-screen-map")).toHaveAttribute(
    "accessibility-elements-hidden",
    "false",
  );
});

// 단언 15: 열리면 가려진다. 언마운트가 아니라 가림이라는 것을 스텝 노드가 여전히
// 문서에 있다는 것으로 함께 단언한다.
test("스텝을 tap해 시트를 열면 맵의 accessibility-elements-hidden이 true가 되고 맵과 스텝은 여전히 문서에 있다", () => {
  render(<JourneyMapScreen />);

  fireEvent.tap(screen.getByTestId("journey-step-node-ordering"), {});

  expect(screen.getByTestId("journey-map-screen-map")).toHaveAttribute(
    "accessibility-elements-hidden",
    "true",
  );
  expect(screen.getByTestId("journey-map-screen-map")).toBeInTheDocument();
  expect(screen.getByTestId("journey-step-node-ordering")).toBeInTheDocument();
});

// 단언 16: 닫으면 되돌아온다. A안(accessibility-exclusive-focus)을 버린 이유가
// "복원 실패"였고, B가 그 실패를 물려받지 않는다는 것을 자동 계층에서 볼 수 있는
// 자리가 이 단언뿐이다(§1.7.1).
test("닫기를 tap하면 맵의 accessibility-elements-hidden이 다시 false로 돌아온다", () => {
  render(<JourneyMapScreen />);

  fireEvent.tap(screen.getByTestId("journey-step-node-ordering"), {});
  expect(screen.getByTestId("journey-map-screen-map")).toHaveAttribute(
    "accessibility-elements-hidden",
    "true",
  );

  fireEvent.tap(screen.getByTestId("step-sheet-close"), {});

  expect(screen.getByTestId("journey-map-screen-map")).toHaveAttribute(
    "accessibility-elements-hidden",
    "false",
  );
});
