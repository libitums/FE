import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { clearBackHandlers, fixtureRoom, mountChat, seedOf } from "./chat-ui.test-support";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import { myMessageTestIds as my } from "./my-message.contract";

// `ui` 계층(chat-scroll-follow F · H): 방 화면이 로그에 넘기는 끝 맞춤 계기 — 사진 · 음성 요청은 읽던 자리와 상관없이 끝으로,
// 말풍선 도구를 펼친 직후의 내용 변화는 따라가지 않는다. 로그(scroll-view)의 위치 값은 이벤트로 직접 보낸다.

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

/** 방에 들어와 첫 끝 맞춤을 마친 뒤 끝(뷰포트 400, 내용 1000)에 선 상태. */
function atEnd(): void {
  tick(16);
  fireLog("layoutchange", { width: 360, height: 400 });
  fireLog("contentsizechanged", { scrollHeight: 1000, scrollTop: 0 });
  fireLog("scroll", { scrollTop: 600, scrollHeight: 1000, deltaY: 600 });
  fireLog("scrollend", { scrollTop: 600, scrollHeight: 1000, deltaY: 0 });
  invoked = [];
}

test("F. 위로 올려 읽는 중이어도 사진을 요청하면(대기 줄이 섬) 끝으로 내린다", () => {
  const { source } = mountChat();
  atEnd();
  fireLog("scroll", { scrollTop: 100, scrollHeight: 1000, deltaY: -40 });

  act(() => {
    source.requestMedia("mina", "photo");
  });
  tick(16);

  expect(scrolls()).toBeGreaterThan(0);
});

test("F. 음성 요청도 끝으로 내린다", () => {
  const { source } = mountChat();
  atEnd();
  fireLog("scroll", { scrollTop: 100, scrollHeight: 1000, deltaY: -40 });

  act(() => {
    source.requestMedia("mina", "voice");
  });
  tick(16);

  expect(scrolls()).toBeGreaterThan(0);
});

test("H. 끝 근처에서 내 말풍선의 해석을 펼치면 그 내용 변화로 끌어내리지 않는다", () => {
  mountChat({
    seed: seedOf(
      fixtureRoom("mina", {
        messages: [
          { kind: "text", from: "them", text: { ko: "안녕", en: "Hi" }, minutesAgo: 9 },
          { kind: "text", from: "me", text: { ko: "안녕하세요", en: "Hello" }, minutesAgo: 5 },
        ],
      }),
    ),
  });
  atEnd();

  const row = screen.getAllByTestId(ids.outgoing).slice(-1)[0] as HTMLElement;
  act(() => {
    fireEvent.tap(within(row).getByTestId(my.toolMeaning), { eventType: "catchEvent" });
  });
  fireLog("contentsizechanged", { scrollHeight: 1120, scrollTop: 600 });

  expect(scrolls()).toBe(0);
});
