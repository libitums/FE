import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { MotionProvider } from "@libitums/ui-lynx/motion";

import { chatLineElementId } from "./chat-log-scroll";
import type { ChatLogReveal } from "./chat.contract";
import { ChatLog } from "./ChatLog";
import { ChatIncomingRow } from "./ChatMessageRow";

// `ui` 계층(GS-UI1 ~ UI3, ADR-0146 개정 ⟨예시 대상⟩): 로그 가운데에 선 줄을 보일 때 — `reveal`이 바뀌면 그 줄 요소로 가운데 맞춤
// 스크롤하고(움직임 줄이기면 점프), 그 뒤 내용이 늘어도 끝으로 끌어내리지 않는다. 상대 줄은 `lineId`로 요소 id를 단다.

type InvokeArgs = { readonly method: string; readonly params?: unknown };
let invoked: { readonly selector: string; readonly args: InvokeArgs }[] = [];
const realQuery = lynx.createSelectorQuery.bind(lynx);

beforeEach(() => {
  vi.useFakeTimers();
  invoked = [];
  vi.spyOn(lynx, "createSelectorQuery").mockImplementation(
    () =>
      ({
        select: (selector: string) => ({
          invoke: (args: InvokeArgs) => {
            invoked.push({ selector, args });
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

const LINE = "11111111-1111-4111-8111-111111111111~snapshot~req";
const fire = (name: string, detail: Record<string, number>): void => {
  const Ctor = screen.getByTestId("log").ownerDocument.defaultView?.CustomEvent;
  if (Ctor === undefined) throw new Error("CustomEvent is unavailable");
  const ref = realQuery().select(`[data-testid="log"]`);
  act(() => {
    fireEvent(ref as unknown as Element, new Ctor(`bindEvent:${name}`, { detail }));
  });
};
const tick = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const intoViews = () => invoked.filter((call) => call.args.method === "scrollIntoView");
const scrollTos = () => invoked.filter((call) => call.args.method === "scrollTo");

function tree(reveal: ChatLogReveal | undefined, motion: "standard" | "reduced" = "standard") {
  return (
    <MotionProvider motion={motion}>
      <ChatLog testId="log" {...(reveal === undefined ? {} : { reveal })}>
        <ChatIncomingRow avatar={{ name: "덕수", imageUrl: null }} testId="row" lineId={LINE}>
          <view />
        </ChatIncomingRow>
      </ChatLog>
    </MotionProvider>
  );
}

test("GS-UI1 reveal이 바뀌면 그 줄 요소로 가운데 맞춤 부드러운 스크롤 — 끝으로 내리지 않고, 그 뒤 내용이 늘어도 끌어내리지 않는다", () => {
  const { rerender } = render(tree(undefined));
  fire("layoutchange", { width: 360, height: 400 });
  tick(1000);
  invoked = [];

  rerender(tree({ lineId: LINE, key: 1 }));
  tick(16);

  expect(intoViews()).toEqual([
    {
      selector: `#${chatLineElementId(LINE)}`,
      args: {
        method: "scrollIntoView",
        params: {
          scrollIntoViewOptions: { block: "center", inline: "start", behavior: "smooth" },
        },
      },
    },
  ]);
  expect(scrollTos()).toEqual([]);
  fire("contentsizechanged", { scrollHeight: 1400, scrollTop: 200, deltaY: 0 });
  tick(16);
  expect(scrollTos()).toEqual([]);

  // 같은 key로 다시 그려도 다시 옮기지 않는다. key가 바뀌면 다시.
  rerender(tree({ lineId: LINE, key: 1 }));
  tick(16);
  expect(intoViews()).toHaveLength(1);
  rerender(tree({ lineId: LINE, key: 2 }));
  tick(16);
  expect(intoViews()).toHaveLength(2);
});

test("GS-UI2 움직임 줄이기면 점프(behavior none)", () => {
  const { rerender } = render(tree(undefined, "reduced"));
  rerender(tree({ lineId: LINE, key: 1 }, "reduced"));
  tick(16);
  expect(intoViews()[0]?.args.params).toEqual({
    scrollIntoViewOptions: { block: "center", inline: "start", behavior: "none" },
  });
});

test("GS-UI3 상대 줄은 lineId로 선택자에 쓸 수 있는 요소 id를 단다 — 없으면 달지 않는다", () => {
  render(tree(undefined));
  const row = screen.getByTestId("row");
  expect(row.getAttribute("id")).toBe(chatLineElementId(LINE));
  expect(chatLineElementId(LINE)).toMatch(/^[A-Za-z0-9_-]+$/);
  cleanup();
  render(
    <ChatIncomingRow avatar={{ name: "덕수", imageUrl: null }} testId="plain">
      <view />
    </ChatIncomingRow>,
  );
  expect(screen.getByTestId("plain").getAttribute("id")).toBeNull();
});
