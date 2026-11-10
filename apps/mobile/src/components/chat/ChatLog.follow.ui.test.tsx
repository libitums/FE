import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { ChatLog } from "./ChatLog";

// `ui` 계층(PR #406 코드 리뷰 #4): 학습자가 위로 올려 읽는 중이면 내용이 늘어도 끝으로 끌어내리지 않는다.
// 끝 근처로 돌아오면(scrolltolower) 다시 따라간다.

type InvokeArgs = { readonly method: string; readonly success?: (info: unknown) => void };
let invoked: InvokeArgs[] = [];
let scrollInfo: { scrollY: number; scrollRange: number } | null = null;
// 이벤트를 보낼 때 쓰는 진짜 selector 참조(테스트 환경이 요소 객체 대신 이것만 받습니다).
const realQuery = lynx.createSelectorQuery.bind(lynx);

beforeEach(() => {
  vi.useFakeTimers();
  invoked = [];
  scrollInfo = null;
  vi.spyOn(lynx, "createSelectorQuery").mockImplementation(
    () =>
      ({
        select: () => ({
          invoke: (args: InvokeArgs) => {
            invoked.push(args);
            if (args.method === "getScrollInfo" && scrollInfo !== null) args.success?.(scrollInfo);
            return { exec: () => undefined };
          },
        }),
      }) as unknown as ReturnType<typeof lynx.createSelectorQuery>,
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const scrollTos = (): number => invoked.filter((call) => call.method === "scrollTo").length;
const fire = (name: string, detail: Record<string, number>): void => {
  const Ctor = screen.getByTestId("log").ownerDocument.defaultView?.CustomEvent;
  if (Ctor === undefined) throw new Error("CustomEvent is unavailable");
  const ref = realQuery().select(`[data-testid="log"]`);
  act(() => {
    fireEvent(ref as unknown as Element, new Ctor(`bindEvent:${name}`, { detail }));
  });
};

test("끝을 보고 있으면 내용 높이가 바뀔 때 끝으로 내린다", () => {
  render(
    <ChatLog testId="log">
      <view />
    </ChatLog>,
  );

  fire("contentsizechanged", { scrollHeight: 900, scrollTop: 0, deltaY: 0 });

  expect(scrollTos()).toBeGreaterThan(0);
});

test("위로 올려 읽는 중이면 내용 높이가 바뀌어도 · followKey가 바뀌어도 끌어내리지 않는다", () => {
  const tree = (key: number) => (
    <ChatLog testId="log" followKey={key}>
      <view />
    </ChatLog>
  );
  const { rerender } = render(tree(1));
  act(() => {
    vi.advanceTimersByTime(16);
  });
  invoked = [];

  fire("scroll", { scrollTop: 100, scrollHeight: 900, deltaY: -40 });
  fire("contentsizechanged", { scrollHeight: 1000, scrollTop: 100, deltaY: 0 });
  rerender(tree(2));
  act(() => {
    vi.advanceTimersByTime(16);
  });

  expect(scrollTos()).toBe(0);
});

test("끝 근처로 돌아오면(scrolltolower) 다시 따라간다", () => {
  render(
    <ChatLog testId="log">
      <view />
    </ChatLog>,
  );
  fire("scroll", { scrollTop: 100, scrollHeight: 900, deltaY: -40 });
  fire("scrolltolower", { scrollTop: 800, scrollHeight: 900, deltaY: 30 });
  invoked = [];

  fire("contentsizechanged", { scrollHeight: 1000, scrollTop: 800, deltaY: 0 });

  expect(scrollTos()).toBeGreaterThan(0);
});

test("scrollend 때 읽은 위치가 끝에서 멀면 따라가지 않고 가까우면 따라간다(바운스백의 음수 deltaY 바로잡기)", () => {
  render(
    <ChatLog testId="log">
      <view />
    </ChatLog>,
  );

  scrollInfo = { scrollY: 100, scrollRange: 900 };
  fire("scrollend", { scrollTop: 100, scrollHeight: 1000, deltaY: 0 });
  invoked = [];
  fire("contentsizechanged", { scrollHeight: 1100, scrollTop: 100, deltaY: 0 });
  expect(scrollTos()).toBe(0);

  scrollInfo = { scrollY: 880, scrollRange: 900 };
  fire("scrollend", { scrollTop: 880, scrollHeight: 1100, deltaY: 0 });
  invoked = [];
  fire("contentsizechanged", { scrollHeight: 1200, scrollTop: 880, deltaY: 0 });
  expect(scrollTos()).toBeGreaterThan(0);
});

test("onTap이 있으면 로그를 눌렀을 때 부른다", () => {
  const onTap = vi.fn<() => void>();
  render(
    <ChatLog testId="log" onTap={onTap}>
      <view />
    </ChatLog>,
  );

  fire("tap", {});

  expect(onTap).toHaveBeenCalledTimes(1);
});
