import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { ChatLog } from "./ChatLog";

// `ui` 계층(chat-scroll-follow A · B · D · E · H): 뷰포트가 줄 때 다시 맞춤 · 첫 진입은 점프 · 진행 중인 부드러운 스크롤을 다시 시작하지
// 않고 묶음 · 펼친 변화는 따라가지 않음. jsdom은 기하를 재지 않으므로 이벤트 값(scrollTop · scrollHeight · 뷰포트)을 직접 보낸다.

type InvokeArgs = { readonly method: string; readonly params?: { readonly smooth?: boolean } };
let invoked: InvokeArgs[] = [];
const realQuery = lynx.createSelectorQuery.bind(lynx);

beforeEach(() => {
  vi.useFakeTimers();
  invoked = [];
  vi.spyOn(lynx, "createSelectorQuery").mockImplementation(
    () =>
      ({
        select: () => ({
          invoke: (args: InvokeArgs) => {
            invoked.push(args);
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

const scrolls = (): InvokeArgs[] => invoked.filter((call) => call.method === "scrollTo");
const smoothOf = (): (boolean | undefined)[] => scrolls().map((call) => call.params?.smooth);
const fire = (name: string, detail: Record<string, number>): void => {
  const Ctor = screen.getByTestId("log").ownerDocument.defaultView?.CustomEvent;
  if (Ctor === undefined) throw new Error("CustomEvent is unavailable");
  const ref = realQuery().select(`[data-testid="log"]`);
  act(() => {
    fireEvent(ref as unknown as Element, new Ctor(`bindEvent:${name}`, { detail }));
  });
};
const tick = (ms: number): void => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

/** 방에 들어와 첫 끝 맞춤(점프)을 마치고 끝(뷰포트 400, 내용 1000)에 선 상태. */
function enteredAtEnd(): void {
  fire("layoutchange", { width: 360, height: 400 });
  fire("contentsizechanged", { scrollHeight: 1000, scrollTop: 0 });
  fire("scroll", { scrollTop: 600, scrollHeight: 1000, deltaY: 600 });
  fire("scrollend", { scrollTop: 600, scrollHeight: 1000, deltaY: 0 });
  invoked = [];
}

test("A. 끝 근처에서 뷰포트가 줄면(띠 · 판 · 키보드) 바로 끝으로 다시 맞춘다 — smooth 없이", () => {
  render(
    <ChatLog testId="log">
      <view />
    </ChatLog>,
  );
  enteredAtEnd();

  fire("layoutchange", { width: 360, height: 340 });

  expect(smoothOf()).toEqual([false]);
});

test("A. 위로 올려 읽는 중이거나 뷰포트가 늘면 다시 맞추지 않는다", () => {
  render(
    <ChatLog testId="log">
      <view />
    </ChatLog>,
  );
  enteredAtEnd();

  fire("layoutchange", { width: 360, height: 460 });
  fire("scroll", { scrollTop: 100, scrollHeight: 1000, deltaY: -40 });
  fire("layoutchange", { width: 360, height: 300 });

  expect(scrolls()).toHaveLength(0);
});

test("B. followKey(키보드 칸)가 바뀌면 끝 근처일 때 끝으로 내린다", () => {
  const tree = (key: number) => (
    <ChatLog testId="log" followKey={key}>
      <view />
    </ChatLog>
  );
  const { rerender } = render(tree(0));
  enteredAtEnd();

  rerender(tree(260));
  tick(16);

  expect(scrolls().length).toBeGreaterThan(0);
});

test("D. 방에 들어와 처음 끝을 맞출 때는 점프다 — 그 뒤 먼 새 말은 부드럽게", () => {
  render(
    <ChatLog testId="log">
      <view />
    </ChatLog>,
  );
  fire("layoutchange", { width: 360, height: 400 });

  fire("contentsizechanged", { scrollHeight: 3000, scrollTop: 0 });
  expect(smoothOf()).toEqual([false]);

  fire("scroll", { scrollTop: 2600, scrollHeight: 3000, deltaY: 2600 });
  fire("scrollend", { scrollTop: 2600, scrollHeight: 3000, deltaY: 0 });
  invoked = [];
  fire("contentsizechanged", { scrollHeight: 3400, scrollTop: 2600 });
  expect(smoothOf()).toEqual([true]);
});

test("D. 기록을 읽는 동안(loading)과 읽은 뒤 첫 끝 맞춤은 점프다", () => {
  const tree = (loading: boolean) => (
    <ChatLog testId="log" loading={loading}>
      <view />
    </ChatLog>
  );
  const { rerender } = render(tree(true));
  fire("layoutchange", { width: 360, height: 400 });
  fire("contentsizechanged", { scrollHeight: 600, scrollTop: 0 });
  fire("contentsizechanged", { scrollHeight: 700, scrollTop: 200 });

  rerender(tree(false));
  fire("contentsizechanged", { scrollHeight: 4000, scrollTop: 300 });

  expect(smoothOf()).toEqual([false, false, false]);
});

test("E. 부드럽게 내려가는 중에 내용이 또 늘면 다시 시작하지 않고, 멈춘 뒤(scrollend) 한 번 더 끝으로 — 짧으면 점프", () => {
  render(
    <ChatLog testId="log">
      <view />
    </ChatLog>,
  );
  enteredAtEnd();

  fire("contentsizechanged", { scrollHeight: 1600, scrollTop: 600 });
  fire("scroll", { scrollTop: 700, scrollHeight: 1600, deltaY: 100 });
  fire("contentsizechanged", { scrollHeight: 1640, scrollTop: 700 });
  fire("contentsizechanged", { scrollHeight: 1680, scrollTop: 720 });
  expect(smoothOf()).toEqual([true]);

  // 우리 스크롤이 끝(1680 − 400 = 1280)에 못 미쳐 멈췄다 — nearEnd를 끄지 않고 다시 끝으로.
  fire("scrollend", { scrollTop: 1200, scrollHeight: 1680, deltaY: 0 });
  expect(smoothOf()).toEqual([true, false]);

  // 그 뒤로도 따라간다.
  fire("contentsizechanged", { scrollHeight: 1720, scrollTop: 1280 });
  expect(scrolls()).toHaveLength(3);
});

test("E. 부드러운 스크롤의 scrollend가 오지 않아도 잠시 뒤에는 다시 끝 맞춤을 시작한다", () => {
  render(
    <ChatLog testId="log">
      <view />
    </ChatLog>,
  );
  enteredAtEnd();

  fire("contentsizechanged", { scrollHeight: 1600, scrollTop: 600 });
  tick(1000);
  fire("contentsizechanged", { scrollHeight: 1640, scrollTop: 600 });

  expect(scrolls()).toHaveLength(2);
});

test("H. 말풍선을 펼친 직후(holdKey가 바뀜)의 내용 변화는 따라가지 않는다", () => {
  const tree = (open: object) => (
    <ChatLog testId="log" holdKey={open}>
      <view />
    </ChatLog>
  );
  const { rerender } = render(tree({}));
  enteredAtEnd();

  rerender(tree({ m1: "fix" }));
  fire("contentsizechanged", { scrollHeight: 1300, scrollTop: 600 });

  expect(scrolls()).toHaveLength(0);
});
