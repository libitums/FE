import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { ChatLogPosition } from "./chat.contract";
import { ChatLog } from "./ChatLog";

// `ui` 계층(chat-new-message-pill R1 · R3 · R4): 로그가 자리(끝 근처 · 한 화면 넘게 멂)가 바뀔 때만 알린다.

const realQuery = lynx.createSelectorQuery.bind(lynx);

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(lynx, "createSelectorQuery").mockImplementation(
    () =>
      ({
        select: () => ({ invoke: () => ({ exec: () => undefined }) }),
      }) as unknown as ReturnType<typeof lynx.createSelectorQuery>,
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const fire = (name: string, detail: Record<string, number>): void => {
  const Ctor = screen.getByTestId("log").ownerDocument.defaultView?.CustomEvent;
  if (Ctor === undefined) throw new Error("CustomEvent is unavailable");
  const ref = realQuery().select(`[data-testid="log"]`);
  act(() => {
    fireEvent(ref as unknown as Element, new Ctor(`bindEvent:${name}`, { detail }));
  });
};

test("LP-UI1. 위로 올리면 떠남 · 한 화면 넘게 올리면 멂 · 끝으로 돌아오면 다시 끝 — 바뀔 때만 한 번씩", () => {
  const seen: ChatLogPosition[] = [];
  render(
    <ChatLog testId="log" onPositionChange={(position) => seen.push(position)}>
      <view />
    </ChatLog>,
  );
  fire("layoutchange", { width: 360, height: 400 });
  fire("scroll", { scrollTop: 600, scrollHeight: 1000, deltaY: 10 });
  act(() => {
    vi.advanceTimersByTime(1000);
  });

  fire("scroll", { scrollTop: 500, scrollHeight: 1000, deltaY: -100 }); // 남은 100 — 떠남, 한 화면 안
  fire("scroll", { scrollTop: 480, scrollHeight: 1000, deltaY: -20 }); // 그대로 — 알리지 않음
  fire("scroll", { scrollTop: 100, scrollHeight: 1000, deltaY: -380 }); // 남은 500 > 400 — 멂
  fire("scrolltolower", { scrollTop: 590, scrollHeight: 1000, deltaY: 490 });

  expect(seen).toEqual([
    { nearEnd: false, far: false },
    { nearEnd: false, far: true },
    { nearEnd: true, far: false },
  ]);
});

test("LP-UI2. 끝 맞춤(보냄 · 알약 누름)이 시작되면 바로 끝으로 알린다", () => {
  const seen: ChatLogPosition[] = [];
  const tree = (key: number) => (
    <ChatLog testId="log" jumpKey={key} onPositionChange={(position) => seen.push(position)}>
      <view />
    </ChatLog>
  );
  const { rerender } = render(tree(0));
  fire("layoutchange", { width: 360, height: 400 });
  act(() => {
    vi.advanceTimersByTime(1000);
  });
  fire("scroll", { scrollTop: 100, scrollHeight: 1000, deltaY: -40 });

  rerender(tree(1));
  act(() => {
    vi.advanceTimersByTime(16);
  });

  expect(seen.slice(-1)).toEqual([{ nearEnd: true, far: false }]);
});
