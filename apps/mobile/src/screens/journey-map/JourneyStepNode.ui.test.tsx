import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import tick from "@libitums/icons/lynx/tick";
import play from "@libitums/icons/lynx/play";
import lock from "@libitums/icons/lynx/lock";
import { color } from "@libitums/design-tokens";

import { JourneyStepNode } from "./JourneyStepNode";
import type { JourneyStepId, JourneyStepStatus } from "./journey-map";
import { UiCopyContext } from "../../lib/ui-copy";
import { markedUiCopy } from "../../lib/ui-copy.test-support";

// `ui` 계층: 렌더 결과와 상호작용만 봅니다(ADR-0006 D4). 계산된 스타일·레이아웃은
// jsdom이 계산하지 않으므로 여기서 단언하지 않습니다 — `toHaveClass`·`toHaveStyle`을
// 쓰지 않습니다(docs/conventions/code.md). 상태는 순수 함수(journey-map.ts)가 이미
// 파생해 props로 넘겨준다는 전제입니다.
//
// 이 컴포넌트는 ui-lynx `LearningUnit`의 어댑터입니다. 표식의 시각·접근성 속성·링·
// 배지는 그 패키지의 테스트가 보고, 여기서는 **결선**만 봅니다 — 여정 스텝의 상태
// 어휘가 유닛 어휘로 어떻게 옮겨 가는지, 어느 상태에 어느 아이콘이 실리는지, 그리고
// 탭이 `onSelect`로 되돌아오는지. 그래서 testid도 `LearningUnit`이 찍는 이름을 씁니다.

// 상태 어휘 표입니다. 두 어휘가 어긋나면 화면이 엉뚱한 표식을 그리므로 여기서 답니다.
const UNIT_STATUS_BY_STATUS: Record<JourneyStepStatus, string> = {
  done: "clear",
  current: "active",
  locked: "default",
};

// `LearningUnit`은 `clear`·`default`에서 아이콘을 스스로 정합니다 — 앱이 넘긴 아이콘이
// 쓰이는 것은 `active`뿐입니다. 색은 유닛이 상태별로 치환해 넘깁니다.
const ICON_BY_STATUS: Record<JourneyStepStatus, string> = {
  done: tick,
  current: play,
  locked: lock,
};

const ICON_COLOR_BY_STATUS: Record<JourneyStepStatus, string> = {
  done: color.white,
  current: color.white,
  locked: color.gray[700],
};

const STATES: readonly JourneyStepStatus[] = ["done", "current", "locked"];

test("스텝 id가 유닛 testid에 실려 스텝마다 갈린다", () => {
  render(<JourneyStepNode id="ordering" title="Ordering" status="current" onSelect={() => {}} />);

  expect(screen.getByTestId("ui-lynx-learning-unit-ordering")).toBeInTheDocument();
});

test.each(STATES)("스텝 상태 %s가 유닛 상태 어휘로 옮겨 간다", (status) => {
  render(<JourneyStepNode id="ordering" title="Ordering" status={status} onSelect={() => {}} />);

  expect(screen.getByTestId("ui-lynx-learning-unit-ordering")).toHaveAttribute(
    "data-status",
    UNIT_STATUS_BY_STATUS[status],
  );
});

test.each(STATES)("상태 %s에 맞는 아이콘과 색이 실린다", (status) => {
  render(<JourneyStepNode id="ordering" title="Ordering" status={status} onSelect={() => {}} />);

  expect(screen.getByTestId("ui-lynx-learning-unit-ordering-icon")).toHaveAttribute(
    "content",
    ICON_BY_STATUS[status].replace(/currentColor/g, ICON_COLOR_BY_STATUS[status]),
  );
});

test("라벨이 title을 텍스트로 낸다", () => {
  render(
    <JourneyStepNode id="greeting" title="First greetings" status="done" onSelect={() => {}} />,
  );

  expect(screen.getByText("First greetings")).toBeInTheDocument();
});

// ---------------------------------------------------------------------- 접근성
//
// 상태는 이름 뒤 접미사로 실립니다(ADR-0016 D3) — `accessibility-value`는 iOS 실기에서
// 낭독되지 않아 그 결정이 통째로 걷은 속성입니다. 접미사를 붙이는 쪽은 `LearningUnit`
// 이므로, 앱은 제목만 넘깁니다. 두 번 붙으면 여기서 빨개집니다.
//
// 문구가 패키지의 영어 접미(`completed` · `current` · `locked`)라는 것도 함께 답니다 — 여정 표의
// `stepStatus`를 앱이 다시 덧붙이면(`current step, current`) 여기서 빨개집니다.

test("[JM1-E] done의 접근성 이름은 제목 뒤에 유닛 접미 completed가 붙는다", () => {
  render(
    <JourneyStepNode id="greeting" title="First greetings" status="done" onSelect={() => {}} />,
  );

  expect(screen.getByTestId("ui-lynx-learning-unit-greeting")).toHaveAttribute(
    "accessibility-label",
    "First greetings, completed",
  );
});

test("[JM1-E] current의 접근성 이름은 제목 뒤에 유닛 접미 current가 붙는다", () => {
  render(<JourneyStepNode id="ordering" title="Ordering" status="current" onSelect={() => {}} />);

  expect(screen.getByTestId("ui-lynx-learning-unit-ordering")).toHaveAttribute(
    "accessibility-label",
    "Ordering, current",
  );
});

test("[JM1-E] locked의 접근성 이름은 제목 뒤에 유닛 접미 locked가 붙는다", () => {
  render(
    <JourneyStepNode id="appointment" title="Making plans" status="locked" onSelect={() => {}} />,
  );

  expect(screen.getByTestId("ui-lynx-learning-unit-appointment")).toHaveAttribute(
    "accessibility-label",
    "Making plans, locked",
  );
});

test.each([
  ["done", "button"],
  ["current", "button"],
  ["locked", "disabled"],
] as const)("accessibility-traits가 상태(%s)의 값이다", (status, traits) => {
  render(<JourneyStepNode id="ordering" title="Ordering" status={status} onSelect={() => {}} />);

  const unit = screen.getByTestId("ui-lynx-learning-unit-ordering");
  expect(unit).toHaveAttribute("accessibility-traits", traits);
  expect(unit).toHaveAttribute("accessibility-element", "true");
});

// ---------------------------------------------------------------------- 상호작용

test.each(["done", "current"] as const)(
  "열 수 있는 상태(%s)를 tap하면 onSelect가 불린다",
  (status) => {
    const onSelect = vi.fn<(id: JourneyStepId, tapY: number) => void>();
    render(<JourneyStepNode id="ordering" title="Ordering" status={status} onSelect={onSelect} />);

    // 실제 탭은 좌표를 싣습니다 — 말풍선이 설 자리가 그 값에서 나옵니다.
    fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), { detail: { y: 512 } });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("ordering", 512);
  },
);

// 잠긴 스텝은 열 수 없습니다. `LearningUnit`이 `default`에서 `bindtap`을 붙이지 않는
// 것과 앱의 `canOpenStep` 가드가 겹쳐 막습니다 — 한쪽이 무너져도 다른 쪽이 잡습니다.
test("잠긴 스텝을 tap해도 onSelect가 불리지 않는다", () => {
  const onSelect = vi.fn<(id: JourneyStepId) => void>();
  render(
    <JourneyStepNode id="appointment" title="Making plans" status="locked" onSelect={onSelect} />,
  );

  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-appointment"), {});

  expect(onSelect).not.toHaveBeenCalled();
});

// JM1-M — 접근성 이름은 제목(데이터)에 패키지 접미 하나만 붙습니다. 문구표를 주입해도 앱이
// 표의 `stepStatus`를 덧붙이지 않고, 제목 자리에 표의 경로가 새지도 않습니다.
const suffixByStatus = { done: "completed", current: "current", locked: "locked" } as const;

test.each(["done", "current", "locked"] as const)(
  "[JM1-M] 문구표를 주입해도 %s의 접근성 이름은 제목 + 패키지 접미 하나다",
  (status) => {
    render(
      <UiCopyContext.Provider value={markedUiCopy}>
        <JourneyStepNode id="ordering" title="Ordering" status={status} onSelect={() => {}} />
      </UiCopyContext.Provider>,
    );

    expect(screen.getByTestId("ui-lynx-learning-unit-ordering")).toHaveAttribute(
      "accessibility-label",
      `Ordering, ${suffixByStatus[status]}`,
    );
  },
);
