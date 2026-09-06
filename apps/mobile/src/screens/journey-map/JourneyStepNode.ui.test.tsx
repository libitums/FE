import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import tick from "@libitums/icons/lynx/tick";
import play from "@libitums/icons/lynx/play";
import lock from "@libitums/icons/lynx/lock";
import { color } from "@libitums/design-tokens";

import { JourneyStepNode } from "./JourneyStepNode";
import type { JourneyStepStatus } from "./journey-map";

// `ui` 계층: 렌더 결과와 상호작용만 본다 (ADR-0006 D4). 계산된 스타일·레이아웃은
// jsdom이 계산하지 않으므로 여기서 단언하지 않는다 — `toHaveClass`·`toHaveStyle`을
// 쓰지 않는다 (docs/conventions/code.md). 상태는 순수 함수(journey-map.ts)가 이미
// 파생해 props로 넘겨준다는 전제이므로, 여기서는 `status`를 그대로 렌더하는지만 본다.
//
// 계약: .agent-harness/work/lib-222/spec.md §3.2(a) 단언 1~9

const STATES: readonly JourneyStepStatus[] = ["done", "current", "locked"];

const ICON_BY_STATUS: Record<JourneyStepStatus, string> = {
  done: tick,
  current: play,
  locked: lock,
};

// design.md §3.1 값 표 — 아이콘 색(TS 상수). done과 current는 같은 상수
// (`color.fg["neutral-inverted"]`)를 쓴다는 것이 design이 실제로 고정한 값이다.
// contract-deviation: 이 사실이 계약 §3.2(a)-6의 "세 값이 서로 같지 않다"는 문구와
// 어긋난다 — 최종 보고에서 다룬다.
const ICON_COLOR_BY_STATUS: Record<JourneyStepStatus, string> = {
  done: color.fg["neutral-inverted"],
  current: color.fg["neutral-inverted"],
  locked: color.fg["neutral-muted"],
};

// 단언 1: 라벨이 title을 낸다.
test("라벨이 title을 텍스트로 낸다", () => {
  render(<JourneyStepNode id="ordering" title="주문하기" status="current" onSelect={() => {}} />);

  expect(screen.getByTestId("journey-step-node-ordering")).toHaveTextContent("주문하기");
});

// 단언 2: data-status가 status와 같다 — 세 상태 각각.
for (const status of STATES) {
  test(`data-status가 상태(${status})와 같다`, () => {
    render(<JourneyStepNode id="ordering" title="주문하기" status={status} onSelect={() => {}} />);

    expect(screen.getByTestId("journey-step-node-ordering")).toHaveAttribute("data-status", status);
  });
}

// 단언 3: accessibility-label이 §1.5 표의 합성 결과다 — 세 상태 각각.
test("accessibility-label이 상태별 접미사를 붙인 합성 결과다 — done", () => {
  render(<JourneyStepNode id="greeting" title="첫 인사" status="done" onSelect={() => {}} />);

  expect(screen.getByTestId("journey-step-node-greeting")).toHaveAttribute(
    "accessibility-label",
    "첫 인사, 완료됨",
  );
});

test("accessibility-label이 상태별 접미사를 붙인 합성 결과다 — current", () => {
  render(<JourneyStepNode id="ordering" title="주문하기" status="current" onSelect={() => {}} />);

  expect(screen.getByTestId("journey-step-node-ordering")).toHaveAttribute(
    "accessibility-label",
    "주문하기, 현재 스텝",
  );
});

test("accessibility-label이 상태별 접미사를 붙인 합성 결과다 — locked", () => {
  render(
    <JourneyStepNode id="appointment" title="약속 잡기" status="locked" onSelect={() => {}} />,
  );

  expect(screen.getByTestId("journey-step-node-appointment")).toHaveAttribute(
    "accessibility-label",
    "약속 잡기, 잠김",
  );
});

// 단언 4 (재고정, 계약 §1.7.2·§4.4·§4.3.3): accessibility-traits가 상태별로 갈린다 —
// done·current는 "button" 그대로, locked는 "disabled"다. accessibility-element="true"는
// 세 상태에서 여전히 갈리지 않는다(§1.7.2 「함께 고정하는 것」 1 — 트리에서 사라지지 않는다).
const TRAITS_BY_STATUS: Record<JourneyStepStatus, "button" | "disabled"> = {
  done: "button",
  current: "button",
  locked: "disabled",
};

for (const status of STATES) {
  test(`accessibility-traits가 상태(${status})의 값이다 · accessibility-element="true"다`, () => {
    render(<JourneyStepNode id="ordering" title="주문하기" status={status} onSelect={() => {}} />);

    const root = screen.getByTestId("journey-step-node-ordering");
    expect(root).toHaveAttribute("accessibility-traits", TRAITS_BY_STATUS[status]);
    expect(root).toHaveAttribute("accessibility-element", "true");
  });
}

// 단언 5: 아이콘 content가 상태별 패키지 모듈 문자열과 같다 — 뒤바뀐 결선을 여기서 잡는다.
for (const status of STATES) {
  test(`아이콘 content가 상태(${status})에 맞는 패키지 모듈 문자열과 같다`, () => {
    render(<JourneyStepNode id="ordering" title="주문하기" status={status} onSelect={() => {}} />);

    expect(screen.getByTestId("journey-step-node-icon-ordering")).toHaveAttribute(
      "content",
      ICON_BY_STATUS[status],
    );
  });
}

// 단언 6: 아이콘 current-color가 상태별 토큰 상수와 같다. 세 값이 서로 같지 않은 것도 본다.
//
// contract-deviation: design.md §3.1 값 표가 실제로 고정한 세 상수는
// done="color.fg['neutral-inverted']"(#FFFFFF) · current="color.fg['neutral-inverted']"(같은
// #FFFFFF) · locked="color.fg['neutral-muted']"(#555D6D)다. done과 current가 문자 그대로
// 같은 상수이므로, 계약 §3.2(a)-6의 "세 값이 서로 같지 않은 것도 함께 본다"를 pairwise 전부
// 다르다는 뜻으로 읽으면 design이 고정한 실제 값과 영구히 어긋난다(항상 실패하는 red가
// 아니라 절대 통과할 수 없는 assertion이 된다). 그래서 여기서는 "세 상태가 전부 같은 값 하나로
// 뭉개지지 않는다"는 뜻으로 읽어 locked가 done·current와 다르다는 것만 단언한다 — 최종
// 보고에서 이 판단을 명시한다.
for (const status of STATES) {
  test(`아이콘 current-color가 상태(${status})의 토큰 상수와 같다`, () => {
    render(<JourneyStepNode id="ordering" title="주문하기" status={status} onSelect={() => {}} />);

    expect(screen.getByTestId("journey-step-node-icon-ordering")).toHaveAttribute(
      "current-color",
      ICON_COLOR_BY_STATUS[status],
    );
  });
}

test("아이콘 색이 세 상태로 뭉개지지 않는다 — locked는 done·current와 다르다", () => {
  expect(ICON_COLOR_BY_STATUS.locked).not.toBe(ICON_COLOR_BY_STATUS.done);
  expect(ICON_COLOR_BY_STATUS.locked).not.toBe(ICON_COLOR_BY_STATUS.current);
});

// 단언 7 (반전, 계약 §1.2.1(e) · §3.2.2(d)(e)): 아이콘 <svg>에는
// accessibility-elements-hidden이 붙지 않는다.
//
// ① 아이콘이 순수 장식인 것은 여전히 참이다. 이 반전은 "장식이 아니게 됐다"가 아니라
//    "가림을 질 자리가 잎이 아니다"이다.
// ② 가릴 자리가 있다면 잎이 아니라 부모 래퍼다 — markerClassByStatus를 입은 <view>다.
//    다만 이 트리에서는 그 래퍼도 가림을 지고 있지 않다: 래퍼 <view> 자신은 그대로 있고
//    #47(LIB-236)이 거기 붙어 있던 accessibility-elements-hidden={true} 한 줄을 지웠다.
//    지워도 되는 이유는 그 래퍼의 자식이 <svg> 하나뿐이라 가릴 접근성 자손이 0개였기
//    때문이다(③과 같은 이유). ⇒ 지금 이 컴포넌트 트리에 가림 선언은 하나도 없고, 그
//    부재를 개수로 못박는 것이 아래 단언 7-b다. 이 주석과 7-b는 같은 말을 한다.
// ③ 잎 <svg>에 붙어 있던 선언은 동작이 0이었다 — LynxUISVG는 LynxUI의
//    enableAccessibilityByDefault를 재정의하지 않아 애초에 접근성 정지 대상이 아니고,
//    가릴 자손도 없다. 최적화로 지운 것이 아니라 처음부터 죽어 있던 선언이다.
// ④ ⛔ D5가 정정되기 전에는 FE ADR-0016 D5가 "아이콘 <svg>에
//    accessibility-elements-hidden={true}"를 지시하고 있었고, 이 단언은 그 문면과
//    어긋난 채로 서 있었다 — 코드가 ADR을 어긴 것이 아니라 D5의 예시 문면이 틀렸던
//    것이고, 그 정정 소유가 LIB-237이었다(계약 §1.2.2의 의도된 ADR 벗어남 창).
//    지금은 정정됐다: D5는 "잎에는 붙이지 않는다. 붙여도 아무 일도 하지 않는다"이고,
//    어긋남은 남아 있지 않다. 근거가 바뀌었을 뿐 방어선은 그대로다 —
//    ADR을 근거로 <svg>의 가림을 되살리지 마라.
// ⑤ 이 두 블록(단언 7 · 7-b)의 주석이 한 번 낡았던 원인은 하나가 아니라 둘이다.
//    (a) "래퍼가 가린다" · "라벨 <text>는 :77" 류 — #47(LIB-236) 자신이 만들었다. 두
//        줄을 지우면서 자기 주석을 안 고쳤다. 이 셋은 #49에 이미 올라가 있었다.
//    (b) "D5는 아직 ...를 지시하고 있다" 류 — 이 브랜치(LIB-237)가 만들었다. D5를
//        정정하는 순간 그 문장이 거짓이 됐다. 이 둘은 #49에 없었다.
//    넘긴 것과 넘기지 않은 것이 한 파일에 섞여 있었다는 뜻이다. 낡은 원인이 정확히
//    좌표였으므로, 지워진 줄은 새 좌표로 갱신하지 않고 앵커로 바꿔 적었다.
//
// 매처는 인자 하나짜리 부정형이다. 인자 둘짜리(not.toHaveAttribute(name, "true"))는
// 속성이 다른 값으로 붙어 있어도 통과해서 부재를 짓지 못한다. 이 이슈가 지려는 것은
// 부재다. 선례: JourneyMapScreen.ui.test.tsx의 [U8](journey-map-screen-scroll).
for (const status of STATES) {
  test(`아이콘에 accessibility-elements-hidden이 붙지 않는다 — 가림은 래퍼가 진다 — ${status}`, () => {
    render(<JourneyStepNode id="ordering" title="주문하기" status={status} onSelect={() => {}} />);

    expect(screen.getByTestId("journey-step-node-icon-ordering")).not.toHaveAttribute(
      "accessibility-elements-hidden",
    );
  });
}

// 단언 7-b (계약 §3.2.3(a)): 가림 선언이 이 컴포넌트 트리 어디에도 없다.
//
// ① 이 단언이 지는 것은 「이 컴포넌트 트리 어디에도 가림 선언이 없다」이지 특정 노드의
//    속성 부재가 아니다. 그래서 가림이 잎 <svg>에서 래퍼로(또는 루트로) 옮겨 붙는 것만
//    으로는 통과하지 못한다 — 위 단언 7은 잎 하나만 보므로 그 이동을 놓친다.
// ② 묶는 것은 render()가 돌려주는 container다. getByTestId로 잡은 루트에
//    querySelectorAll을 걸면 루트 자신(JourneyStepNode.tsx:55)이 매치 대상에서 빠지므로,
//    누가 루트에 가림을 붙이면 잡지 못한다. 트리 전체를 지려면 container여야 한다.
//    셀렉터에 값을 쓰지 않는 이유도 같다 — [...="true"]로 좁히면 다른 값으로 붙은 가림을
//    놓쳐 부재를 지지 못한다(단언 7의 인자 하나짜리 부정형과 같은 이유).
// ③ 래퍼(markerClassByStatus를 입은 <view>)에 붙어 있던 가림도 동작이 0이었다 — 그
//    래퍼의 자식은 <svg> 하나뿐이라 가릴 접근성 자손이 0개다. 라벨 <text>는 그 래퍼
//    **밖** 형제라 애초에 가려질 자리가 아니었다. #47(LIB-236)이 그 한 줄을 지웠고,
//    지워진 좌표는 새 좌표로 갱신하지 않는다 — 그 줄은 없다.
// ④ 정본과의 구분: AssessmentItem.tsx:60의 래퍼는 안에 <svg>와 <text>가 함께 있어 그
//    <text>를 실제로 가린다. 기준은 「래퍼냐」가 아니라 「가릴 접근성 자손이 있느냐」다 —
//    「래퍼면 붙인다」로 일반화하지 마라.
// ⑤ ⛔ FE ADR-0016 D5는 정정됐다(정정 소유는 LIB-237이었다). 지금 D5는 "잎에는 붙이지
//    않는다"이고, "자손이 <svg>·<view>뿐인 래퍼에 붙이는 것은 잎에 붙이는 것과 같다"로
//    표식 래퍼까지 같이 본다. 근거가 바뀌었을 뿐 방어선은 그대로다 — ADR을 근거로
//    표식 래퍼 <view>에도 아이콘 <svg>에도 가림을 되살리지 마라.
//
// 선례: SentenceOrderScreen.ui.test.tsx:371·376 · ListeningScreen.ui.test.tsx:490·494.
for (const status of STATES) {
  test(`가림 선언이 컴포넌트 트리 어디에도 없다 — ${status}`, () => {
    const { container } = render(
      <JourneyStepNode id="ordering" title="주문하기" status={status} onSelect={() => {}} />,
    );

    expect(container.querySelectorAll("[accessibility-elements-hidden]")).toHaveLength(0);
  });
}

// 단언 8 (재고정, 계약 §1.7.2·§4.4·§4.3.3): tap하면 onSelect가 그 id로 정확히 한 번
// 불린다 — done·current만. locked는 더는 이 갈래에 없다(아래 8-locked가 진짜 게이트다).
for (const status of ["done", "current"] as const) {
  test(`tap하면 onSelect가 id로 정확히 한 번 불린다 — ${status}`, () => {
    const onSelect = vi.fn<(id: string) => void>();
    render(
      <JourneyStepNode id="appointment" title="약속 잡기" status={status} onSelect={onSelect} />,
    );

    fireEvent.tap(screen.getByTestId("journey-step-node-appointment"), {});

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("appointment");
  });
}

// 단언 8-locked — 계약이 고정한 막는 자리(§1.7.2)를 여기서 직접 본다. bindtap은
// 세 상태에서 언제나 붙지만(§1.7.2), 잠김일 때는 onSelect가 한 번도 불리지 않는다.
// 다른 부수효과가 없다는 것은 이 컴포넌트가 onSelect 외에 아무 것도 호출하지
// 않는 순수 렌더이므로 onSelect 호출 여부 하나로 충분히 판정된다.
test("tap해도 onSelect가 불리지 않는다 — locked(잠긴 스텝은 시트를 열지 않는다)", () => {
  const onSelect = vi.fn<(id: string) => void>();
  render(
    <JourneyStepNode id="appointment" title="약속 잡기" status="locked" onSelect={onSelect} />,
  );

  fireEvent.tap(screen.getByTestId("journey-step-node-appointment"), {});

  expect(onSelect).not.toHaveBeenCalled();
});

// 단언 9: onSelect가 불려도 렌더 상태는 그대로다 — 컴포넌트가 상태를 갖지 않는다.
test("onSelect가 불려도 렌더된 data-status는 그대로다 — 컴포넌트는 상태를 갖지 않는다", () => {
  render(<JourneyStepNode id="ordering" title="주문하기" status="current" onSelect={() => {}} />);

  fireEvent.tap(screen.getByTestId("journey-step-node-ordering"), {});

  expect(screen.getByTestId("journey-step-node-ordering")).toHaveAttribute(
    "data-status",
    "current",
  );
});
