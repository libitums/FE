import { afterEach, expect, test } from "vitest";
import { useState } from "@lynx-js/react";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

// `ui` 계층(TD1): 앞 시험이 지운 노드의 늦은 정리(ReactLynx 런타임, 실제 10초 뒤)가 다음 시험의 노드를 지우지 않는다.
// 시험 환경은 시험마다 노드 id를 0부터 다시 세므로, 남은 정리가 같은 id의 새 노드를 지우면 그 노드의 누름이 조용히 사라진다.
// 한 파일이 10초를 넘기는 느린 러너에서만 드러난다. 두 시험의 순서가 곧 시나리오다. 가짜 시계 없이 실제로 기다린다.

afterEach(cleanup);

function Removable() {
  const [shown, setShown] = useState(true);
  return (
    <view>
      {shown ? (
        <view
          data-testid="removable"
          bindtap={() => {
            setShown(false);
          }}
        />
      ) : null}
    </view>
  );
}

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <view>
      <view data-testid="counter" bindtap={() => setCount((value) => value + 1)}>
        <text data-testid="count">{String(count)}</text>
      </view>
    </view>
  );
}

test("TD1a. 앞 시험이 노드를 지운다", () => {
  render(<Removable />);
  fireEvent.tap(screen.getByTestId("removable"), {});
  expect(screen.queryByTestId("removable")).toBeNull();
});

test(
  "TD1b. 10초 뒤에도 다음 시험의 같은 id 노드는 누름을 받는다",
  { timeout: 20_000 },
  async () => {
    render(<Counter />);
    await new Promise((resolve) => setTimeout(resolve, 10_200));
    fireEvent.tap(screen.getByTestId("counter"), {});
    expect(screen.getByTestId("count").textContent).toBe("1");
  },
);
