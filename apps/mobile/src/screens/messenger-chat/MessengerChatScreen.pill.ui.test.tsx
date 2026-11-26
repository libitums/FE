import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import type { EpisodeIntroEvent } from "../episode-intro/episode-intro.contract";
import { clearBackHandlers, mountChat } from "./chat-ui.test-support";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import { newMessagePillTestIds as pill } from "./new-message-pill.contract";

// `ui` 계층(chat-new-message-pill R1 · R3 · R4 · R6 · R7): 위로 올려 읽는 중 상대 답이 오면 알약이 서고(끌어내리지 않음), 누르면 끝으로
// 가며 사라지고 이벤트가 한 줄 난다. 보내면 사라진다. 새 것 없이 한 화면 넘게 올리면 ↓ 단추. 로그 위치는 이벤트로 직접 보낸다.

type InvokeArgs = { readonly method: string };
let invoked: InvokeArgs[] = [];
let events: EpisodeIntroEvent[] = [];
const realQuery = lynx.createSelectorQuery.bind(lynx);

beforeEach(() => {
  vi.useFakeTimers();
  invoked = [];
  events = [];
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
  clearBackHandlers();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const scrolls = (): number => invoked.filter((call) => call.method === "scrollTo").length;
const fireLog = (name: string, detail: Record<string, number>): void => {
  const Ctor = screen.getByTestId(ids.log).ownerDocument.defaultView?.CustomEvent;
  if (Ctor === undefined) throw new Error("CustomEvent is unavailable");
  const ref = realQuery().select(`[data-testid="${ids.log}"]`);
  act(() => {
    fireEvent(ref as unknown as Element, new Ctor(`bindEvent:${name}`, { detail }));
  });
};
const tick = (ms: number): void => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

function openRoom() {
  const mounted = mountChat({ eventSink: (event) => events.push(event) });
  tick(16);
  fireLog("layoutchange", { width: 360, height: 400 });
  fireLog("contentsizechanged", { scrollHeight: 1000, scrollTop: 0 });
  fireLog("scroll", { scrollTop: 600, scrollHeight: 1000, deltaY: 600 });
  fireLog("scrollend", { scrollTop: 600, scrollHeight: 1000, deltaY: 0 });
  tick(1000);
  return mounted;
}

/** 내가 보낸 뒤 바로 위로 올린다 — 답은 떠나 있는 동안 온다. */
function sendThenScrollUp(source: ReturnType<typeof mountChat>["source"]): void {
  act(() => {
    source.sendText("mina", "안녕하세요");
  });
  tick(16);
  fireLog("scroll", { scrollTop: 400, scrollHeight: 1100, deltaY: -40 });
}

test("NP-UI1. 위로 올려 읽는 중 상대 답이 오면 알약이 서고 끌어내리지 않는다", () => {
  const { source } = openRoom();
  sendThenScrollUp(source);
  invoked = [];

  tick(5000); // 정해 둔 답 도착
  fireLog("contentsizechanged", { scrollHeight: 1200, scrollTop: 400 });

  const shown = screen.getByTestId(pill.pill);
  expect(shown.textContent).toContain("New message");
  expect(shown.getAttribute("accessibility-label")).toBe("Jump to new messages");
  expect(scrolls()).toBe(0);
  expect(screen.queryByTestId(pill.latest)).toBeNull();
});

test("NP-UI2. 알약을 누르면 끝으로 가고 사라지며 이벤트가 한 줄 난다", () => {
  const { source } = openRoom();
  sendThenScrollUp(source);
  tick(5000);
  invoked = [];

  act(() => {
    fireEvent.tap(screen.getByTestId(pill.pill), {});
  });
  tick(16);

  expect(scrolls()).toBeGreaterThan(0);
  expect(screen.queryByTestId(pill.pill)).toBeNull();
  const jumped = events.filter((event) => event.name === "chat_new_messages_jumped");
  expect(jumped).toEqual([
    expect.objectContaining({ characterId: "mina", count: "1", media: "message", surface: "chat" }),
  ]);
});

test("NP-UI3. 알약이 선 채 내가 보내면 사라진다", () => {
  const { source } = openRoom();
  sendThenScrollUp(source);
  tick(5000);
  expect(screen.queryByTestId(pill.pill)).not.toBeNull();

  act(() => {
    source.sendText("mina", "또 왔어요");
  });
  tick(16);

  expect(screen.queryByTestId(pill.pill)).toBeNull();
});

test("NP-UI4. 새 것 없이 한 화면 넘게 올리면 ↓ 단추만 서고, 누르면 끝으로 간다", () => {
  openRoom();
  fireLog("scroll", { scrollTop: 100, scrollHeight: 1000, deltaY: -500 }); // 남은 500 > 뷰포트 400
  invoked = [];

  expect(screen.queryByTestId(pill.pill)).toBeNull();
  const latest = screen.getByTestId(pill.latest);
  expect(latest.getAttribute("accessibility-label")).toBe("Scroll to latest");

  act(() => {
    fireEvent.tap(latest, {});
  });
  tick(16);
  expect(scrolls()).toBeGreaterThan(0);
  expect(screen.queryByTestId(pill.latest)).toBeNull();
});

test("NP-UI5. 끝 근처에서 답이 오면 알약 없이 따라간다", () => {
  const { source } = openRoom();
  act(() => {
    source.sendText("mina", "안녕하세요");
  });
  tick(5000);

  expect(screen.queryByTestId(pill.pill)).toBeNull();
  expect(screen.queryByTestId(pill.latest)).toBeNull();
});
