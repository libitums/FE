import { act, fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { useTypewriter, type TypewriterOptions } from "./useTypewriter";

function Sample(props: TypewriterOptions) {
  const typing = useTypewriter(props);
  return (
    <text data-testid="typing" data-complete={typing.isComplete} bindtap={typing.finish}>
      {typing.visibleText}
    </text>
  );
}

const output = () => screen.getByTestId("typing");
const tick = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test("한글과 surrogate pair를 자르지 않고 지정한 속도로 출력하고 완료하면 타이머를 해제한다", () => {
  render(<Sample text="가🙂B" intervalMs={40} />);
  expect(output().textContent).toBe("");
  expect(output()).toHaveAttribute("data-complete", "false");
  tick(39);
  expect(output().textContent).toBe("");
  tick(1);
  expect(output()).toHaveTextContent("가");
  tick(40);
  expect(output()).toHaveTextContent("가🙂");
  tick(40);
  expect(output()).toHaveTextContent("가🙂B");
  expect(output()).toHaveAttribute("data-complete", "true");
  expect(vi.getTimerCount()).toBe(0);
});

test("finish는 즉시 전체를 표시하고 이후 타이머가 대사를 되돌리지 않는다", () => {
  render(<Sample text="안녕하세요" />);
  tick(35);
  fireEvent.tap(output(), {});
  expect(output()).toHaveTextContent("안녕하세요");
  expect(output()).toHaveAttribute("data-complete", "true");
  expect(vi.getTimerCount()).toBe(0);
  tick(1000);
  expect(output()).toHaveTextContent("안녕하세요");
});

test("대기 중에는 글자가 없고 대기 후 지정 속도로 출력한다", () => {
  render(<Sample text="AB" delayMs={2000} intervalMs={100} />);
  tick(2000);
  expect(output().textContent).toBe("");
  tick(100);
  expect(output().textContent).toBe("A");
  tick(100);
  expect(output().textContent).toBe("AB");
  expect(vi.getTimerCount()).toBe(0);
});

test("대기 중 탭으로 완성하면 예약된 출력이 다시 시작하지 않는다", () => {
  render(<Sample text="AB" delayMs={2000} />);
  fireEvent.tap(output(), {});
  expect(vi.getTimerCount()).toBe(0);
  tick(3000);
  expect(output().textContent).toBe("AB");
});

test("재렌더는 이어가고 text 또는 resetKey 변경은 처음부터 시작한다", () => {
  const startTimer = vi.spyOn(globalThis, "setInterval");
  const clearTimer = vi.spyOn(globalThis, "clearInterval");
  const view = render(<Sample text="ABC" resetKey={0} intervalMs={40} />);
  tick(40);
  view.rerender(<Sample text="ABC" resetKey={0} intervalMs={40} />);
  tick(40);
  expect(output()).toHaveTextContent("AB");
  view.rerender(<Sample text="XYZ" resetKey={0} intervalMs={40} />);
  expect(output().textContent).toBe("");
  tick(40);
  expect(output()).toHaveTextContent("X");
  view.rerender(<Sample text="XYZ" resetKey={1} intervalMs={40} />);
  expect(output().textContent).toBe("");
  tick(40);
  expect(output()).toHaveTextContent("X");
  view.unmount();
  for (const timer of startTimer.mock.results) {
    expect(clearTimer).toHaveBeenCalledWith(timer.value);
  }
  startTimer.mockRestore();
  clearTimer.mockRestore();
});

test.each([
  { text: "" },
  { text: "ABC", enabled: false },
  { text: "ABC", reducedMotion: true },
  { text: "ABC", intervalMs: 0 },
])("즉시 표시 옵션과 빈 문자열은 타이머를 만들지 않는다: %j", (props) => {
  render(<Sample {...props} />);
  expect(output().textContent).toBe(props.text);
  expect(output()).toHaveAttribute("data-complete", "true");
  expect(vi.getTimerCount()).toBe(0);
});

test("출력 중 모션을 끄면 즉시 완료하고 다시 켜면 처음부터 출력한다", () => {
  const view = render(<Sample text="ABC" />);
  tick(35);
  view.rerender(<Sample text="ABC" reducedMotion />);
  expect(output().textContent).toBe("ABC");
  expect(vi.getTimerCount()).toBe(0);
  view.rerender(<Sample text="ABC" />);
  expect(output().textContent).toBe("");
  tick(35);
  expect(output().textContent).toBe("A");
});

test.each([NaN, Infinity, -1])("잘못된 간격 %s는 기본 속도로 복구한다", (intervalMs) => {
  render(<Sample text="AB" intervalMs={intervalMs} />);
  tick(35);
  expect(output().textContent).toBe("A");
});
