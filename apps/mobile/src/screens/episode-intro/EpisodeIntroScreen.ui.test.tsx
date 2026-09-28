import { expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { EpisodeIntroScreen } from "./EpisodeIntroScreen";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4). `toHaveClass`·`toHaveStyle`을 쓰지
// 않습니다. 텍스트 질의(`getByText`)를 쓰지 않습니다 — testid로 질의합니다.

function renderIntro(overrides: Partial<Parameters<typeof EpisodeIntroScreen>[0]> = {}) {
  const props = {
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    label: "Episode 0.",
    title: "Tutorial.",
    onBack: vi.fn<() => void>(),
    onSkip: vi.fn<() => void>(),
    onNext: vi.fn<() => void>(),
    ...overrides,
  };
  render(<EpisodeIntroScreen {...props} />);
  return props;
}

function buttonIn(testId: string, inner: string): HTMLElement {
  return within(screen.getByTestId(testId)).getByTestId(inner);
}

test("[I1] 에피소드의 두 줄을 그리고, 한 머리말로 묶어 읽는다", () => {
  renderIntro();

  expect(screen.getByTestId("episode-intro-screen-label")).toHaveTextContent("Episode 0.");
  expect(screen.getByTestId("episode-intro-screen-title")).toHaveTextContent("Tutorial.");
  const heading = screen.getByTestId("episode-intro-screen-heading");
  expect(heading).toHaveAttribute("accessibility-element", "true");
  expect(heading).toHaveAttribute("accessibility-traits", "header");
  expect(heading).toHaveAttribute("accessibility-label", "Episode 0. Tutorial.");
});

test("[I2] header trait를 가진 요소가 머리말 하나다", () => {
  renderIntro();

  const headers = screen
    .getByTestId("episode-intro-screen")
    .querySelectorAll('[accessibility-traits="header"]');
  expect(Array.from(headers).map((el) => el.getAttribute("data-testid"))).toEqual([
    "episode-intro-screen-heading",
  ]);
});

test("[I3] 뒤로 버튼이 맵으로라는 이름을 싣고, tap → onBack 1회", () => {
  const props = renderIntro();

  const back = buttonIn("episode-intro-screen-back", "ui-lynx-round-button");
  expect(back).toHaveAttribute("accessibility-label", "맵으로");
  fireEvent.tap(back, {});

  expect(props.onBack).toHaveBeenCalledTimes(1);
  expect(props.onSkip).not.toHaveBeenCalled();
  expect(props.onNext).not.toHaveBeenCalled();
});

function dialogAction(id: "skip" | "stay"): HTMLElement {
  return within(screen.getByTestId(`ui-lynx-dialog-action-${id}`)).getByTestId("ui-lynx-button");
}

test("[I4] Skip tap은 곧장 건너뛰지 않고 확인 모달을 띄운다", () => {
  const props = renderIntro();
  expect(screen.queryByTestId("episode-intro-screen-confirm")).not.toBeInTheDocument();

  fireEvent.tap(buttonIn("episode-intro-screen-skip", "ui-lynx-button"), {});

  const confirm = screen.getByTestId("episode-intro-screen-confirm");
  expect(within(confirm).getByTestId("ui-lynx-dialog-title")).toHaveTextContent(
    "이야기를 건너뛸까요?",
  );
  expect(props.onSkip).not.toHaveBeenCalled();
  expect(props.onNext).not.toHaveBeenCalled();
});

test("[I4b] 모달의 건너뛰기 → onSkip 1회, 모달이 닫힌다", () => {
  const props = renderIntro();
  fireEvent.tap(buttonIn("episode-intro-screen-skip", "ui-lynx-button"), {});

  fireEvent.tap(dialogAction("skip"), {});

  expect(props.onSkip).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId("episode-intro-screen-confirm")).not.toBeInTheDocument();
});

test("[I4c] 모달의 계속 보기 → onSkip 0회, 모달만 닫히고 표지에 남는다", () => {
  const props = renderIntro();
  fireEvent.tap(buttonIn("episode-intro-screen-skip", "ui-lynx-button"), {});

  fireEvent.tap(dialogAction("stay"), {});

  expect(props.onSkip).not.toHaveBeenCalled();
  expect(screen.queryByTestId("episode-intro-screen-confirm")).not.toBeInTheDocument();
  expect(screen.getByTestId("episode-intro-screen-heading")).toBeInTheDocument();
});

test("[I4d] 모달이 떠 있는 동안 뒤쪽이 가려지고, 닫히면 풀린다", () => {
  renderIntro();
  const safe = screen.getByTestId("episode-intro-screen-safe");
  expect(safe).toHaveAttribute("accessibility-elements-hidden", "false");

  fireEvent.tap(buttonIn("episode-intro-screen-skip", "ui-lynx-button"), {});
  expect(safe).toHaveAttribute("accessibility-elements-hidden", "true");

  fireEvent.tap(dialogAction("stay"), {});
  expect(safe).toHaveAttribute("accessibility-elements-hidden", "false");
});

test("[I5] Next tap → onNext 1회, 다른 콜백 0회", () => {
  const props = renderIntro();

  fireEvent.tap(buttonIn("episode-intro-screen-next", "ui-lynx-button"), {});

  expect(props.onNext).toHaveBeenCalledTimes(1);
  expect(props.onSkip).not.toHaveBeenCalled();
  expect(props.onBack).not.toHaveBeenCalled();
});

test("[I6] 낭독 순서 — 뒤로 → 머리말 → Skip → Next", () => {
  renderIntro();

  const order = [
    "episode-intro-screen-back",
    "episode-intro-screen-heading",
    "episode-intro-screen-skip",
    "episode-intro-screen-next",
  ].map((testId) => screen.getByTestId(testId));
  for (let index = 1; index < order.length; index += 1) {
    expect(
      (order[index - 1] as HTMLElement).compareDocumentPosition(order[index] as HTMLElement) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  }
});

test("[I7] 가장자리 여백을 여백 상자가 인라인으로 잡는다", () => {
  renderIntro({ insets: { top: 62, bottom: 34, left: 0, right: 0 } });

  const style = screen.getByTestId("episode-intro-screen-safe").getAttribute("style") ?? "";
  expect(style).toContain("62px");
  expect(style).toContain("34px");
});
