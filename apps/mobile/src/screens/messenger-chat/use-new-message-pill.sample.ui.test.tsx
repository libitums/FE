import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";
import type { ReactNode } from "@lynx-js/react";

import { chatLineElementId } from "../../components/chat/chat-log-scroll";
import { ChatLog } from "../../components/chat/ChatLog";
import { ChatIncomingRow } from "../../components/chat/ChatMessageRow";
import { mediaLineId } from "./chat-media-rules";
import { samplePrefixOf } from "./chat-sample-target";
import type { ChatMessage, ChatThread } from "./chat-source.contract";
import { newMessagePillTestIds as ids } from "./new-message-pill.contract";
import { useNewMessagePill } from "./use-new-message-pill";

// `ui` 계층(GS-UI4 ~ UI7, ADR-0146 개정 ⟨예시 대상⟩): 안내의 무료 예시 줄은 첫 인사 아래(로그 가운데)에 선다. 끝을 보던 학습자는
// 그 줄로 옮겨 보이고(기본 (a)), 위로 읽는 중이면 결과가 왔을 때 「위에 도착 ↑」 알약(b)을 세운다. 예시 줄은 끝으로 내리지 않고
// 「새 메시지 ↓」로 세지 않는다.

type InvokeArgs = { readonly method: string };
let invoked: { readonly selector: string; readonly method: string }[] = [];
const realQuery = lynx.createSelectorQuery.bind(lynx);

beforeEach(() => {
  vi.useFakeTimers();
  invoked = [];
  vi.spyOn(lynx, "createSelectorQuery").mockImplementation(
    () =>
      ({
        select: (selector: string) => ({
          invoke: (args: InvokeArgs) => {
            invoked.push({ selector, method: args.method });
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

const G = "11111111-1111-4111-8111-111111111111";
const R = "22222222-2222-4222-8222-222222222222";
const M = "33333333-3333-4333-8333-333333333333";
const say = (id: string): ChatMessage => ({
  id,
  at: 1,
  kind: "text",
  from: "them",
  text: { ko: "말", en: "" },
});
const greeting = say(`${G}#0`);
const mine: ChatMessage = { id: "u1", at: 2, kind: "text", from: "me", text: { ko: "답", en: "" } };
const reply = say(`${R}#0`);
const pendingLine: ChatMessage = {
  id: mediaLineId(G, "photo", "req"),
  at: 3,
  kind: "photo-pending",
  startedAt: 3,
};
const photoLine: ChatMessage = {
  id: mediaLineId(G, "photo", M),
  at: 4,
  kind: "photo",
  imageUrl: null,
};
const SAMPLES = [samplePrefixOf(G, "photo")];

function threadOf(messages: readonly ChatMessage[], samples?: readonly string[]): ChatThread {
  return {
    roomId: "duksu",
    counterpart: { id: "duksu", name: "덕수", avatarUrl: null },
    messages,
    typing: false,
    server: { history: "loaded", unsent: [], recovery: "none" },
    awaitingReply: false,
    ideas: [],
    settings: { autoIdeas: false, storyPointId: "" },
    storyPoints: [],
    notes: {},
    ratings: {},
    inputBlock: null,
    ...(samples === undefined ? {} : { samples }),
  };
}

function Harness({ thread }: { readonly thread: ChatThread }): ReactNode {
  const pill = useNewMessagePill(thread.roomId, thread);
  return (
    <view>
      <ChatLog testId="log" {...pill.logProps}>
        {thread.messages.map((message) => (
          <ChatIncomingRow
            key={message.id}
            avatar={{ name: "덕수", imageUrl: null }}
            testId="row"
            lineId={message.id}
          >
            <view />
          </ChatIncomingRow>
        ))}
      </ChatLog>
      {pill.view}
    </view>
  );
}

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
const intoViews = () =>
  invoked.filter((call) => call.method === "scrollIntoView").map((call) => call.selector);
const scrollTos = () => invoked.filter((call) => call.method === "scrollTo").length;
const base = [greeting, mine, reply];

function mount() {
  const view = render(<Harness thread={threadOf(base)} />);
  fire("layoutchange", { width: 360, height: 400 });
  fire("contentsizechanged", { scrollHeight: 1000, scrollTop: 0 });
  fire("scroll", { scrollTop: 600, scrollHeight: 1000, deltaY: 600 });
  fire("scrollend", { scrollTop: 600, scrollHeight: 1000, deltaY: 0 });
  tick(1000);
  invoked = [];
  return view;
}

test("GS-UI4 끝을 보던 중 예시를 받으면 대기 줄 · 결과 줄로 옮겨 보이고, 끝으로 내리지 않는다", () => {
  const { rerender } = mount();

  rerender(<Harness thread={threadOf([greeting, pendingLine, mine, reply], SAMPLES)} />);
  tick(16);
  expect(intoViews()).toEqual([`#${chatLineElementId(pendingLine.id)}`]);
  expect(scrollTos()).toBe(0);

  // 우리가 옮겼으니 끝에서 멀어졌다 — 학습자가 손대지 않은 채 결과가 오면 그 줄로 한 번 더.
  fire("scroll", { scrollTop: 200, scrollHeight: 1000, deltaY: -400 });
  rerender(<Harness thread={threadOf([greeting, photoLine, mine, reply], SAMPLES)} />);
  tick(16);
  expect(intoViews()).toEqual([
    `#${chatLineElementId(pendingLine.id)}`,
    `#${chatLineElementId(photoLine.id)}`,
  ]);
  expect(scrollTos()).toBe(0);
  expect(screen.queryByTestId(ids.above)).toBeNull();
  // 예시 사진은 「새 메시지 ↓」로 세지 않는다.
  expect(screen.queryByTestId(ids.pill)).toBeNull();
});

test("GS-UI5 위로 읽는 중이면 대기 줄로 끌어가지 않고, 결과가 오면 「위에 도착 ↑」 알약 — 누르면 그 줄로 옮기고 사라진다", () => {
  const { rerender } = mount();
  fire("scroll", { scrollTop: 300, scrollHeight: 1000, deltaY: -300 });
  tick(1000);
  invoked = [];

  rerender(<Harness thread={threadOf([greeting, pendingLine, mine, reply], SAMPLES)} />);
  tick(16);
  expect(intoViews()).toEqual([]);
  expect(screen.queryByTestId(ids.above)).toBeNull();

  rerender(<Harness thread={threadOf([greeting, photoLine, mine, reply], SAMPLES)} />);
  tick(16);
  expect(intoViews()).toEqual([]);
  const above = screen.getByTestId(ids.above);
  expect(above.textContent).toContain("Photo arrived above");
  expect(above.getAttribute("accessibility-label")).toBe("Photo arrived above");
  expect(screen.queryByTestId(ids.pill)).toBeNull();
  expect(scrollTos()).toBe(0);

  act(() => {
    fireEvent.tap(above, {});
  });
  tick(16);
  expect(intoViews()).toEqual([`#${chatLineElementId(photoLine.id)}`]);
  expect(screen.queryByTestId(ids.above)).toBeNull();
});

test("GS-UI6 음성 예시면 알약 문구가 음성이다", () => {
  const { rerender } = mount();
  fire("scroll", { scrollTop: 300, scrollHeight: 1000, deltaY: -300 });
  tick(1000);
  const voice: ChatMessage = {
    id: mediaLineId(G, "voice", M),
    at: 4,
    kind: "voice",
    durationMs: 0,
    text: { ko: "말", en: "" },
    audioUrl: null,
  };
  rerender(
    <Harness thread={threadOf([greeting, voice, mine, reply], [samplePrefixOf(G, "voice")])} />,
  );
  tick(16);
  expect(screen.getByTestId(ids.above).textContent).toContain("Voice message arrived above");
});

test("GS-UI7 예시가 아닌 매체 줄(유료 — 가장 최근 메시지)은 지금처럼 끝으로 내린다", () => {
  const { rerender } = mount();
  const paid: ChatMessage = {
    id: mediaLineId(R, "photo", "req"),
    at: 3,
    kind: "photo-pending",
    startedAt: 3,
  };
  rerender(<Harness thread={threadOf([...base, paid])} />);
  tick(16);
  expect(scrollTos()).toBeGreaterThan(0);
  expect(intoViews()).toEqual([]);
});
