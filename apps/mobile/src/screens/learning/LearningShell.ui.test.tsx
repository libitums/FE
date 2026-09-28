import { expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { LearningShell } from "./LearningShell";

// `ui` 계층: 렌더 결과와 상호작용만 봅니다 (ADR-0006 D4). `toHaveClass`·`toHaveStyle`을
// 쓰지 않습니다 (docs/conventions/code.md).
function renderShell(overrides: Partial<Parameters<typeof LearningShell>[0]> = {}) {
  return render(
    <LearningShell
      form="listening"
      activityIndex={1}
      totalActivityCount={4}
      instruction="대화를 완성하세요"
      onExit={() => {}}
      card={<text data-testid="fixture-card">카드 안</text>}
      actionLabel="Check"
      onAction={() => {}}
      {...overrides}
    />,
  );
}

test("세션 헤더가 순번 · 학습형 · 백분율을 낸다", () => {
  renderShell();

  expect(screen.getByTestId("learning-shell-chapter")).toHaveTextContent("Chapter 2 / 4");
  expect(screen.getByTestId("learning-shell-form")).toHaveTextContent("Listening");
  expect(screen.getByTestId("learning-shell-percent")).toHaveTextContent("25%");
});

// 막대는 값이라 낱말 둘을 한 접근성 요소로 묶어 읽히게 합니다.
test("진행이 하나의 접근성 요소로 이름을 낸다", () => {
  renderShell();

  expect(screen.getByTestId("learning-shell-progress")).toHaveAttribute(
    "accessibility-label",
    "Listening, 활동 4개 중 2번째",
  );
});

test("첫 활동에서는 채움 막대를 그리지 않는다", () => {
  renderShell({ activityIndex: 0 });

  expect(screen.queryByTestId("learning-shell-progress-fill")).not.toBeInTheDocument();
});

// 껍데기는 카드 안에 무엇이 서는지 모릅니다 — 받은 것을 그 자리에 그릴 뿐입니다.
test("카드로 받은 것이 카드 안에 선다", () => {
  renderShell();

  const card = screen.getByTestId("learning-shell-stage");

  expect(within(card).getByTestId("fixture-card")).toBeInTheDocument();
});

test("작업 영역은 받았을 때만 선다", () => {
  renderShell();
  expect(screen.queryByTestId("learning-shell-workspace")).not.toBeInTheDocument();
});

test("작업 영역을 받으면 그 안에 그린다", () => {
  renderShell({ workspace: <text data-testid="fixture-workspace">낱말</text> });

  const workspace = screen.getByTestId("learning-shell-workspace");

  expect(within(workspace).getByTestId("fixture-workspace")).toBeInTheDocument();
});

test("나가기가 접근성 속성을 갖고 tap하면 onExit이 한 번 불린다", () => {
  const onExit = vi.fn<() => void>();
  renderShell({ onExit });

  const exit = screen.getByTestId("learning-shell-exit");
  expect(exit).toHaveAttribute("accessibility-label", "학습 나가기");
  expect(exit).toHaveAttribute("accessibility-traits", "button");

  fireEvent.tap(exit, {});

  expect(onExit).toHaveBeenCalledTimes(1);
});

test("아래 버튼이 라벨을 이름과 글자 둘 다로 내고 tap하면 onAction이 한 번 불린다", () => {
  const onAction = vi.fn<() => void>();
  renderShell({ onAction });

  const action = screen.getByTestId("learning-shell-action");
  expect(action).toHaveAttribute("accessibility-label", "Check");
  expect(action).toHaveTextContent("Check");

  fireEvent.tap(action, {});

  expect(onAction).toHaveBeenCalledTimes(1);
});

// 나가기와 아래 버튼은 서로의 콜백을 부르지 않습니다.
test("나가기를 tap해도 onAction은 불리지 않는다", () => {
  const onAction = vi.fn<() => void>();
  renderShell({ onAction });

  fireEvent.tap(screen.getByTestId("learning-shell-exit"), {});

  expect(onAction).not.toHaveBeenCalled();
});

// DOM 순서가 곧 낭독 순서입니다.
test("DOM 순서 — 세션 헤더 → 지시문 → 카드 → 버튼", () => {
  const { container } = renderShell();

  const order = [...container.querySelectorAll("[data-testid]")]
    .map((el) => el.getAttribute("data-testid"))
    .filter((id) =>
      [
        "learning-shell-session",
        "learning-shell-instruction",
        "learning-shell-stage",
        "learning-shell-action",
      ].includes(id ?? ""),
    );

  expect(order).toEqual([
    "learning-shell-session",
    "learning-shell-instruction",
    "learning-shell-stage",
    "learning-shell-action",
  ]);
});

// ---------------------------------------------------------------- 자동 넘김 (2026-09-28)
//
// 판정을 보인 뒤 저절로 다음으로 가는 층입니다. 화면은 「언제 넘어갈지」만 정하고
// (`delayMs`) 「무엇이 일어날지」는 `run`에 담아 껍데기에 건넵니다 — 껍데기는 세션도
// 문항도 모릅니다.
//
// 가짜 시계를 씁니다. 실제로 2.5초를 기다리면 이 파일 하나가 테스트 시간을 초 단위로
// 늘리고, 기다림의 길이가 곧 계약인 자리라 `waitFor`로는 「너무 이르게 불리지
// 않는다」를 못 봅니다.

test("advance를 받지 않으면 넘김 층이 없다", () => {
  renderShell();

  expect(screen.queryByTestId("learning-shell-advance")).not.toBeInTheDocument();
});

test("advance를 받으면 넘김 층이 이름과 조작 단위를 낸다", () => {
  renderShell({ advance: { label: "다음으로", run: () => {}, delayMs: 2500 } });

  const advance = screen.getByTestId("learning-shell-advance");
  expect(advance).toHaveAttribute("accessibility-element", "true");
  expect(advance).toHaveAttribute("accessibility-label", "다음으로");
  expect(advance).toHaveAttribute("accessibility-traits", "button");
});

// 기다리는 시간이 계약입니다 — 그 직전까지는 불리지 않아야 「보여 주는 시간」이
// 실제로 보장됩니다.
test("delayMs가 지나면 run이 저절로 한 번 불리고, 그 전에는 불리지 않는다", () => {
  vi.useFakeTimers();
  const run = vi.fn<() => void>();

  renderShell({ advance: { label: "다음으로", run, delayMs: 2500 } });

  vi.advanceTimersByTime(2499);
  expect(run).not.toHaveBeenCalled();

  vi.advanceTimersByTime(1);
  expect(run).toHaveBeenCalledTimes(1);

  vi.useRealTimers();
});

// 기다림은 **최대**이지 최소가 아닙니다 — 탭이 남은 시간을 건너뜁니다. 그리고 건너뛴
// 뒤 타이머가 살아 있으면 다음 문항이 곧바로 또 넘어갑니다.
test("넘김 층을 tap하면 run이 즉시 한 번 불리고 남은 타이머는 다시 부르지 않는다", () => {
  vi.useFakeTimers();
  const run = vi.fn<() => void>();

  renderShell({ advance: { label: "다음으로", run, delayMs: 2500 } });

  fireEvent.tap(screen.getByTestId("learning-shell-advance"), {});
  expect(run).toHaveBeenCalledTimes(1);

  vi.advanceTimersByTime(5000);
  expect(run).toHaveBeenCalledTimes(1);

  vi.useRealTimers();
});

// 화면을 떠난 뒤 넘어가면 이미 없는 세션을 움직이는 것이 됩니다.
test("언마운트된 뒤에는 run이 불리지 않는다", () => {
  vi.useFakeTimers();
  const run = vi.fn<() => void>();

  const { unmount } = renderShell({ advance: { label: "다음으로", run, delayMs: 2500 } });
  unmount();

  vi.advanceTimersByTime(5000);
  expect(run).not.toHaveBeenCalled();

  vi.useRealTimers();
});

// 한 걸음은 한 번만 밟힙니다 — 층이 사라지기 전에 두 번 눌리는 것은 실제로 일어나고,
// 두 번 밟히면 문항 하나가 통째로 건너뛰어집니다.
test("같은 걸음을 두 번 tap해도 run은 한 번만 불린다", () => {
  const run = vi.fn<() => void>();
  renderShell({ advance: { label: "다음으로", run, delayMs: 2500 } });

  const advance = screen.getByTestId("learning-shell-advance");
  fireEvent.tap(advance, {});
  fireEvent.tap(advance, {});

  expect(run).toHaveBeenCalledTimes(1);
});
