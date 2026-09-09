import { expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { JourneyMapScreen } from "./JourneyMapScreen";
import {
  initialCompletedStepCount,
  journeySteps,
  stepStatusAt,
  type JourneyStepId,
} from "./journey-map";

// 메신저 계약 props는 기존 여정 맵 UI fixture에서 공통으로 비워 둔다.
const messengerFixture = {
  completedMessengerUnitIds: [] as const,
  onStartMessengerUnit: vi.fn(),
};

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4).
// 이 화면은 제목 텍스트 하나만 그린다 — 탭 라벨(`여정`)과 화면 제목(`여정 맵`)은
// 다르다 (screens.contract.ts).
test("여정 맵 화면이 제목을 렌더한다", () => {
  render(
    <JourneyMapScreen
      {...messengerFixture}
      completedStepCount={initialCompletedStepCount}
      onStartStep={() => {}}
    />,
  );

  expect(screen.getByTestId("journey-map-screen-title")).toHaveTextContent("여정 맵");
});

// 재고정 2026-09-02: 제목 다섯이 같은 방식으로 heading이 된다 (screens.contract.ts).
test("여정 맵 화면 제목이 accessibility-traits header를 갖는다", () => {
  render(
    <JourneyMapScreen
      {...messengerFixture}
      completedStepCount={initialCompletedStepCount}
      onStartStep={() => {}}
    />,
  );

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
  render(
    <JourneyMapScreen
      {...messengerFixture}
      completedStepCount={initialCompletedStepCount}
      onStartStep={() => {}}
    />,
  );

  journeySteps.forEach((step, index) => {
    const expectedStatus = stepStatusAt(index, initialCompletedStepCount);

    expect(screen.getByTestId(`journey-step-node-${step.id}`)).toHaveAttribute(
      "data-status",
      expectedStatus,
    );
  });
});

// 단언 8: 처음에는 step-sheet-panel이 없다.
test("처음에는 시트가 렌더되지 않는다", () => {
  render(
    <JourneyMapScreen
      {...messengerFixture}
      completedStepCount={initialCompletedStepCount}
      onStartStep={() => {}}
    />,
  );

  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
});

// 단언 9: journey-step-node-ordering을 tap하면 시트가 나타나고 그 스텝의 정보를 낸다.
test("스텝을 tap하면 시트가 열리고 그 스텝의 제목·설명을 낸다", () => {
  render(
    <JourneyMapScreen
      {...messengerFixture}
      completedStepCount={initialCompletedStepCount}
      onStartStep={() => {}}
    />,
  );

  fireEvent.tap(screen.getByTestId("journey-step-node-ordering"), {});

  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
  expect(screen.getByTestId("step-sheet-title")).toHaveTextContent("주문하기");
  expect(screen.getByTestId("step-sheet-description")).toHaveTextContent(
    "카페에서 마실 것을 주문한다",
  );
});

// 단언 10: step-sheet-close를 tap하면 시트가 사라지고 화면 제목은 그대로다.
test("닫기를 tap하면 시트가 사라지고 화면 제목은 그대로다", () => {
  render(
    <JourneyMapScreen
      {...messengerFixture}
      completedStepCount={initialCompletedStepCount}
      onStartStep={() => {}}
    />,
  );

  fireEvent.tap(screen.getByTestId("journey-step-node-ordering"), {});
  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("step-sheet-close"), {});

  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
  expect(screen.getByTestId("journey-map-screen-title")).toHaveTextContent("여정 맵");
});

// 단언 11: 시트가 열린 상태에서 다른 스텝을 tap하면 시트가 그 스텝으로 바뀐다
// (제목이 갈린다. 시트가 둘이 되지 않는다).
test("시트가 열린 채 다른 스텝을 tap하면 시트가 그 스텝으로 바뀐다", () => {
  render(
    <JourneyMapScreen
      {...messengerFixture}
      completedStepCount={initialCompletedStepCount}
      onStartStep={() => {}}
    />,
  );

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
  render(
    <JourneyMapScreen
      {...messengerFixture}
      completedStepCount={initialCompletedStepCount}
      onStartStep={() => {}}
    />,
  );

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
  render(
    <JourneyMapScreen
      {...messengerFixture}
      completedStepCount={initialCompletedStepCount}
      onStartStep={() => {}}
    />,
  );

  fireEvent.tap(screen.getByTestId("journey-step-node-ordering"), {});
  expect(screen.getByTestId("step-sheet-title")).toHaveTextContent("주문하기");

  fireEvent.tap(screen.getByTestId("journey-step-node-appointment"), {});

  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
  expect(screen.getByTestId("step-sheet-title")).toHaveTextContent("주문하기");
});

// 단언 13 (**뒤집힘** — LIB-223 계약 §3.2(e)-2): `시작`은 더 이상 무동작이 아니다.
// lib-222에서 이 자리가 "tap해도 아무 일도 일어나지 않는다"였던 근거는 `StepSheetProps`에
// 목적지가 없다는 것 하나였다. 계약 §1.6이 `onStart`를 채우고 §1.7이 그 목적지를
// "열린 스텝의 id를 그대로 위로 올린다"로 고정했으므로, **같은 tap이 이제
// `onStartStep(열린 스텝 id)`를 낸다.** 옛 단언을 그대로 두면 통과하면서 계약을
// 거짓으로 말한다 — 시트가 열려 있는 것은 여전히 참이지만 "무동작"은 이제 거짓이다.
//
// 시트가 그대로 열려 있다는 관찰은 **버리지 않고 뜻만 갈아 끼운다**: 이 화면은 시트를
// 명시적으로 닫지 않는다(§1.7 「시트를 명시적으로 닫지 않는다」). 닫히는 것은 App이
// 학습 화면을 렌더해 이 화면이 언마운트될 때이고, 그것은 integration의 몫이다.
test("시작을 tap하면 onStartStep이 열린 스텝의 id로 한 번 불린다", () => {
  const onStartStep = vi.fn<(id: JourneyStepId) => void>();
  render(
    <JourneyMapScreen
      {...messengerFixture}
      completedStepCount={initialCompletedStepCount}
      onStartStep={onStartStep}
    />,
  );

  fireEvent.tap(screen.getByTestId("journey-step-node-ordering"), {});
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});

  expect(onStartStep).toHaveBeenCalledTimes(1);
  expect(onStartStep).toHaveBeenCalledWith("ordering");
  // 시트를 닫는 주체는 이 화면이 아니다 — 화면 전환이 언마운트로 버린다.
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
  render(
    <JourneyMapScreen
      {...messengerFixture}
      completedStepCount={initialCompletedStepCount}
      onStartStep={() => {}}
    />,
  );

  expect(screen.getByTestId("journey-map-screen-map")).toHaveAttribute(
    "accessibility-elements-hidden",
    "false",
  );
});

// 단언 15: 열리면 가려진다. 언마운트가 아니라 가림이라는 것을 스텝 노드가 여전히
// 문서에 있다는 것으로 함께 단언한다.
test("스텝을 tap해 시트를 열면 맵의 accessibility-elements-hidden이 true가 되고 맵과 스텝은 여전히 문서에 있다", () => {
  render(
    <JourneyMapScreen
      {...messengerFixture}
      completedStepCount={initialCompletedStepCount}
      onStartStep={() => {}}
    />,
  );

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
  render(
    <JourneyMapScreen
      {...messengerFixture}
      completedStepCount={initialCompletedStepCount}
      onStartStep={() => {}}
    />,
  );

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

// ------------------------------------------------- LIB-223 계약 §3.2(e)-1 (더하는 단언)
// 진행이 **모듈 상수가 아니라 props**에서 온다는 것의 `ui` 쪽 관찰. 단언 7이
// `initialCompletedStepCount`(=2)로 보는 것과 같은 채널(`data-status`)을 다른 값으로
// 읽어, 화면이 받은 값을 실제로 소비하는지를 가른다. props를 무시하고 상수를 읽으면
// ordering이 여전히 "current"로 나와 여기서 실패한다.
test("completedStepCount=3으로 렌더하면 ordering이 done, appointment가 current다", () => {
  render(<JourneyMapScreen {...messengerFixture} completedStepCount={3} onStartStep={() => {}} />);

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

// 엣지 (계약 §1.5(a) 「여정이 전부 완료된다」): completedStepCount=5면 다섯 전부 done이고
// **current인 스텝이 하나도 없는 것이 정상**이다. 새 상태어도 새 분기도 없다는 것을
// 화면 쪽에서 한 번 못박는다.
test("completedStepCount=5로 렌더하면 다섯 전부 done이고 current인 스텝이 없다", () => {
  render(<JourneyMapScreen {...messengerFixture} completedStepCount={5} onStartStep={() => {}} />);

  journeySteps.forEach((step) => {
    expect(screen.getByTestId(`journey-step-node-${step.id}`)).toHaveAttribute(
      "data-status",
      "done",
    );
  });
});

// ---------------------------------------------------------------- 스크롤 영역 (LIB-226 계약 §3.2 U1·U2·U3·U4)
//
// 여정 맵은 액션 행이 없다(계약 §1.4) — 고정은 머리(제목)뿐이고 흐름은 맵 하나다.
// 시트는 스크롤 밖의 겹침 레이어다(R9). 이 계층이 판정하는 것은 "구조가 계약대로
// 짜였다"까지다 — 실제 스크롤·가림 서브트리 동작은 실기 몫이다(§3.2 말미).

// U1: 스크롤 컨테이너가 존재한다.
test("[U1] journey-map-screen-scroll이 존재한다", () => {
  render(
    <JourneyMapScreen
      {...messengerFixture}
      completedStepCount={initialCompletedStepCount}
      onStartStep={() => {}}
    />,
  );

  expect(screen.getByTestId("journey-map-screen-scroll")).toBeInTheDocument();
});

// U2: 흐름 자식(맵 컨테이너)이 스크롤 컨테이너 안에 있다.
test("[U2] journey-map-screen-map이 스크롤 컨테이너 안에 있다", () => {
  render(
    <JourneyMapScreen
      {...messengerFixture}
      completedStepCount={initialCompletedStepCount}
      onStartStep={() => {}}
    />,
  );

  const scroll = screen.getByTestId("journey-map-screen-scroll");
  expect(within(scroll).getByTestId("journey-map-screen-map")).toBeInTheDocument();
});

// U3: 고정 자식(제목)이 스크롤 컨테이너 밖에 있다.
test("[U3] journey-map-screen-title이 스크롤 컨테이너 밖에 있다", () => {
  render(
    <JourneyMapScreen
      {...messengerFixture}
      completedStepCount={initialCompletedStepCount}
      onStartStep={() => {}}
    />,
  );

  const scroll = screen.getByTestId("journey-map-screen-scroll");
  expect(within(scroll).queryByTestId("journey-map-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("journey-map-screen-title")).toBeInTheDocument();
});

// U4: 시트는 스크롤 밖의 겹침 레이어다(R9) — 열려 있어도 스크롤 컨테이너 안에서는
// 찾을 수 없다.
test("[U4] 시트를 열어도 step-sheet-panel은 스크롤 컨테이너 밖이다", () => {
  render(
    <JourneyMapScreen
      {...messengerFixture}
      completedStepCount={initialCompletedStepCount}
      onStartStep={() => {}}
    />,
  );

  fireEvent.tap(screen.getByTestId("journey-step-node-ordering"), {});

  const scroll = screen.getByTestId("journey-map-screen-scroll");
  expect(within(scroll).queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
});

// ---------------------------------------------------------------- 스크롤 영역 접근성 부재 (LIB-226 계약 §3.2.1 U8)
//
// R6·R6.1의 「없음」을 지키는 회귀 그물이다(계약 §2.3 · §3.2.1). 오늘의 구현은 이
// 넷을 하나도 붙이지 않는다 — **red가 없는 것이 이 케이스의 성질이다.** 다음 편집이
// 넷 중 하나라도 붙이면 여기서만 red가 되고, 그 red는 이 파일을 고치라는 신호가
// 아니라 계약(§8.3)으로 되돌아가라는 신호다.
test("[U8] 스크롤 컨테이너에 accessibility-*가 하나도 붙지 않는다", () => {
  render(
    <JourneyMapScreen
      {...messengerFixture}
      completedStepCount={initialCompletedStepCount}
      onStartStep={() => {}}
    />,
  );

  const scroll = screen.getByTestId("journey-map-screen-scroll");
  expect(scroll).not.toHaveAttribute("accessibility-element");
  expect(scroll).not.toHaveAttribute("accessibility-label");
  expect(scroll).not.toHaveAttribute("accessibility-traits");
  expect(scroll).not.toHaveAttribute("accessibility-elements-hidden");
});

// ---------------------------------------------------------------- 스크롤 세로 동작 (LIB-226 계약 §3.2.2 U9·U10·U11, r4)
//
// R5 폐기 → R5.1~R5.3. `<scroll-view>`는 `scroll-orientation` prop이 없으면
// `_enableScrollY` 초기값이 NO라 세로 스크롤이 원리적으로 불가능하다(design §8.2).
// jsdom은 레이아웃이 없어 실제로 스크롤되는지는 이 계층이 원리적으로 못 본다
// (§3.2.2 말미, 실기가 답한다).
//
// U11의 기댓값이 문자열 "true"인 이유: `@lynx-js/testing-environment`의
// `__SetAttribute`(ElementPAPI.js:87~89)가 boolean을 `JSON.stringify`로 직렬화한다.

// U9: scroll-orientation이 "vertical"로 붙어 있다.
test("[U9] journey-map-screen-scroll에 scroll-orientation='vertical'이 붙는다", () => {
  render(
    <JourneyMapScreen
      {...messengerFixture}
      completedStepCount={initialCompletedStepCount}
      onStartStep={() => {}}
    />,
  );

  expect(screen.getByTestId("journey-map-screen-scroll")).toHaveAttribute(
    "scroll-orientation",
    "vertical",
  );
});

// U11: scroll-bar-enable이 (JSON.stringify를 거친) 문자열 "true"로 붙어 있다.
test("[U11] journey-map-screen-scroll에 scroll-bar-enable='true'가 붙는다", () => {
  render(
    <JourneyMapScreen
      {...messengerFixture}
      completedStepCount={initialCompletedStepCount}
      onStartStep={() => {}}
    />,
  );

  expect(screen.getByTestId("journey-map-screen-scroll")).toHaveAttribute(
    "scroll-bar-enable",
    "true",
  );
});

// U10: 스크롤 컨테이너의 직계 요소 자식이 하나를 넘지 않는다. 여정 맵은 오늘도
// 직계 자식이 하나(journey-map-screen-map)뿐이라 green이다(R7.1의 「나머지 넷은 안
// 샌다」 표).
test("[U10] 스크롤 컨테이너의 직계 자식이 하나를 넘지 않는다", () => {
  render(
    <JourneyMapScreen
      {...messengerFixture}
      completedStepCount={initialCompletedStepCount}
      onStartStep={() => {}}
    />,
  );

  expect(screen.getByTestId("journey-map-screen-scroll").children.length).toBeLessThanOrEqual(1);
});
