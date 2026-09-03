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

// 단언 7: 아이콘이 accessibility-elements-hidden="true" — 순수 장식이다.
for (const status of STATES) {
  test(`아이콘이 accessibility-elements-hidden="true"다 — ${status}`, () => {
    render(<JourneyStepNode id="ordering" title="주문하기" status={status} onSelect={() => {}} />);

    expect(screen.getByTestId("journey-step-node-icon-ordering")).toHaveAttribute(
      "accessibility-elements-hidden",
      "true",
    );
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
