import { act, render, screen } from "@lynx-js/react/testing-library";
import { afterEach, expect, test, vi } from "vitest";
import { CallLineBubble } from "./CallCaller";

afterEach(() => vi.useRealTimers());

test("통화 자막은 글자별로 출력하고 번역은 완료 후 표시하며 접근성 이름은 유지한다", () => {
  vi.useFakeTimers();
  render(
    <CallLineBubble text="안녕🙂" translation="Hello" testIdPrefix="call" reveal="typewriter" />,
  );
  expect(screen.getByTestId("call-line")).toHaveAttribute("data-status", "revealing");
  expect(screen.getByTestId("call-line")).toHaveAttribute("accessibility-label", "안녕🙂, Hello");
  expect(screen.getByTestId("call-line-translation")).toHaveStyle({ visibility: "hidden" });
  expect(screen.getByTestId("call-line-measure")).toHaveTextContent("안녕🙂");
  act(() => {
    vi.advanceTimersByTime(35);
  });
  expect(screen.getByTestId("call-line-text").textContent).toBe("안");
  act(() => {
    vi.advanceTimersByTime(70);
  });
  expect(screen.getByTestId("call-line-text").textContent).toBe("안녕🙂");
  expect(screen.getByTestId("call-line")).toHaveAttribute("data-status", "ready");
  expect(screen.getByTestId("call-line-translation")).toHaveTextContent("Hello");
  expect(screen.getByTestId("call-line-translation")).toHaveStyle({ visibility: "visible" });
});

test("같은 자막도 재생 키가 바뀌면 다시 출력하고 즉시 표시로 바꾸면 전체를 보여준다", () => {
  vi.useFakeTimers();
  const props = {
    text: "여보세요?",
    translation: "Hello?",
    testIdPrefix: "call",
    reveal: "typewriter" as const,
  };
  const view = render(<CallLineBubble {...props} resetKey={0} />);
  act(() => {
    vi.advanceTimersByTime(70);
  });
  expect(screen.getByTestId("call-line-text").textContent).toBe("여보");
  view.rerender(<CallLineBubble {...props} resetKey={1} />);
  expect(screen.getByTestId("call-line")).toHaveAttribute("data-status", "revealing");
  act(() => {
    vi.advanceTimersByTime(35);
  });
  expect(screen.getByTestId("call-line-text").textContent).toBe("여");
  view.rerender(<CallLineBubble {...props} reveal="instant" />);
  expect(screen.getByTestId("call-line-text").textContent).toBe("여보세요?");
  expect(vi.getTimerCount()).toBe(0);
});

test("모션 축소 옵션은 전체 자막과 번역을 즉시 표시한다", () => {
  render(
    <CallLineBubble
      text="안녕"
      translation="Hi"
      testIdPrefix="call"
      reveal="typewriter"
      reducedMotion
    />,
  );
  expect(screen.getByTestId("call-line")).toHaveAttribute("data-status", "ready");
  expect(screen.getByTestId("call-line-text")).toHaveTextContent("안녕");
  expect(screen.getByTestId("call-line-translation")).toHaveTextContent("Hi");
});
