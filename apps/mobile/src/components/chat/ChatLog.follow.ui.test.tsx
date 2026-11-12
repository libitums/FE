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

test("scrollend 때 위치로 판정한다 — 끝에서 멀면 따라가지 않고(바운스백 음수 deltaY 포함) 가까우면 따라간다", () => {
  render(
    <ChatLog testId="log">
      <view />
    </ChatLog>,
  );
  fire("layoutchange", { width: 360, height: 400 });

  // 끝 = scrollHeight − scrollTop − 뷰포트 높이(400)이다.
  fire("scrollend", { scrollTop: 100, scrollHeight: 1000, deltaY: 0 });
  invoked = [];
  fire("contentsizechanged", { scrollHeight: 1100, scrollTop: 100, deltaY: 0 });
  expect(scrollTos()).toBe(0);

  fire("scroll", { scrollTop: 690, scrollHeight: 1100, deltaY: -12 });
  fire("scrollend", { scrollTop: 700, scrollHeight: 1100, deltaY: 0 });
  invoked = [];
  fire("contentsizechanged", { scrollHeight: 1200, scrollTop: 700, deltaY: 0 });
  expect(scrollTos()).toBeGreaterThan(0);
});

// 기기 F2: 우리가 끝으로 내린 스크롤이 멈추면(scrollend) getScrollInfo의 scrollRange(내용 전체 높이로 보임)를 끝 위치로 오해해
// 「끝에서 멀다」고 굳어졌고, 그 뒤 새 말풍선을 따라가지 않았다.
test("F2. 끝으로 내린 스크롤이 멈춘 뒤에도(scrollend) 다음 말풍선을 따라간다 — scrollRange가 내용 전체 높이여도", () => {
  render(
    <ChatLog testId="log">
      <view />
    </ChatLog>,
  );
  fire("layoutchange", { width: 360, height: 400 });
  fire("contentsizechanged", { scrollHeight: 1000, scrollTop: 0, deltaY: 0 });
  expect(scrollTos()).toBe(1);

  // 기기가 보이는 값: scrollRange = 내용 전체 높이(1000), scrollY = 600(끝).
  scrollInfo = { scrollY: 600, scrollRange: 1000 };
  fire("scroll", { scrollTop: 600, scrollHeight: 1000, deltaY: 60 });
  fire("scrollend", { scrollTop: 600, scrollHeight: 1000, deltaY: 0 });
  invoked = [];
  fire("contentsizechanged", { scrollHeight: 1100, scrollTop: 600, deltaY: 0 });

  expect(scrollTos()).toBe(1);
});

test("F2. 내려가는 도중(끝에서 멀다)에 내용이 또 늘어도 우리 스크롤이 진행 중이면 다시 끝으로 내린다", () => {
  render(
    <ChatLog testId="log">
      <view />
    </ChatLog>,
  );
  fire("layoutchange", { width: 360, height: 400 });
  fire("contentsizechanged", { scrollHeight: 1000, scrollTop: 0, deltaY: 0 });
  fire("scroll", { scrollTop: 300, scrollHeight: 1000, deltaY: 80 });
  invoked = [];

  fire("contentsizechanged", { scrollHeight: 1100, scrollTop: 300, deltaY: 0 });

  expect(scrollTos()).toBe(1);
});

test("F2. jumpKey가 바뀌면(내가 보냄) 위로 올려 읽던 중이어도 항상 끝으로 내리고 다시 따라간다", () => {
  const tree = (key: number) => (
    <ChatLog testId="log" jumpKey={key}>
      <view />
    </ChatLog>
  );
  const { rerender } = render(tree(0));
  act(() => {
    vi.advanceTimersByTime(16);
  });
  fire("layoutchange", { width: 360, height: 400 });
  fire("scroll", { scrollTop: 100, scrollHeight: 900, deltaY: -40 });
  invoked = [];

  rerender(tree(1));
  act(() => {
    vi.advanceTimersByTime(16);
  });
  expect(scrollTos()).toBe(1);

  // 보낸 뒤 늘어나는 내용(답장)도 따라간다.
  fire("contentsizechanged", { scrollHeight: 1000, scrollTop: 100, deltaY: 0 });
  expect(scrollTos()).toBe(2);
});

test("F2. jumpKey가 같으면 끌어내리지 않는다(상대 도착은 근처일 때만 따라간다)", () => {
  const tree = (follow: number) => (
    <ChatLog testId="log" jumpKey={3} followKey={follow}>
      <view />
    </ChatLog>
  );
  const { rerender } = render(tree(1));
  act(() => {
    vi.advanceTimersByTime(16);
  });
  fire("scroll", { scrollTop: 100, scrollHeight: 900, deltaY: -40 });
  invoked = [];

  rerender(tree(2));
  act(() => {
    vi.advanceTimersByTime(16);
  });

  expect(scrollTos()).toBe(0);
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
