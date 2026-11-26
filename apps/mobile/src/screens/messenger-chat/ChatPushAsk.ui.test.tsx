import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { EpisodeIntroEvent } from "../episode-intro/episode-intro.contract";
import { ChatEventsContext } from "./chat-events";
import {
  chatPushAskTestIds as ids,
  type ChatPushAskAnswer,
  type ChatPushAskDue,
  type ChatPushAskPort,
} from "./chat-push-ask.contract";
import type { ChatMessage, ChatThread } from "./chat-source.contract";
import { ChatPushAskCard, ChatPushAskContext, ChatPushAskOn, ChatPushAskSlot } from "./ChatPushAsk";

// `ui` 계층(CPA-UI1 ~ UI8): 채팅 첫 답장 뒤 알림 권한 카드 · 켠 뒤 한 줄(ADR-0197 D3 · D4).
// 포트는 대역 — 판정 · 등록은 unit · integration이 봅니다.

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const NAME = "덕수쌤";
const mine = (id: string): ChatMessage => ({
  id,
  at: 1,
  kind: "text",
  from: "me",
  text: { ko: "안녕", en: "" },
});
const theirs = (id: string): ChatMessage => ({
  id,
  at: 2,
  kind: "text",
  from: "them",
  text: { ko: "네", en: "Yes" },
});

function threadOf(messages: readonly ChatMessage[]): ChatThread {
  return {
    roomId: "owner",
    counterpart: { id: "owner", name: NAME, avatarUrl: null },
    messages,
    typing: false,
    server: null,
    awaitingReply: false,
    ideas: [],
    settings: { autoIdeas: false },
    storyPoints: [],
    notes: {},
    ratings: {},
    inputBlock: null,
  } as unknown as ChatThread;
}

const flush = () =>
  act(async () => {
    for (let i = 0; i < 6; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  });

const tap = (testId: string) =>
  act(() => {
    const el = screen.getByTestId(testId);
    const inner = el.querySelector('[data-testid="ui-lynx-button"]');
    fireEvent.tap(inner ?? el, {});
  });

function mount(port: ChatPushAskPort | null) {
  const events: EpisodeIntroEvent[] = [];
  const tree = (messages: readonly ChatMessage[], busy: boolean) => (
    <ChatEventsContext.Provider value={{ sink: (event) => events.push(event), roomId: "owner" }}>
      <ChatPushAskContext.Provider value={port}>
        <ChatPushAskSlot thread={threadOf(messages)} busy={busy} />
      </ChatPushAskContext.Provider>
    </ChatEventsContext.Provider>
  );
  const view = render(tree([theirs("hello")], false));
  const show = (messages: readonly ChatMessage[], busy: boolean) =>
    act(() => {
      view.rerender(tree(messages, busy));
    });
  return { events, show };
}

function fakePort(due: ChatPushAskDue, answer: ChatPushAskAnswer = "allowed") {
  let resolveTurnOn: (value: ChatPushAskAnswer) => void = () => undefined;
  const port = {
    due: vi.fn(async () => due),
    turnOn: vi.fn(
      () =>
        new Promise<ChatPushAskAnswer>((resolve) => {
          resolveTurnOn = resolve;
        }),
    ),
  };
  return { port, answer: () => act(async () => resolveTurnOn(answer)) };
}

/** 열기(인사 하나) → 보냄 → 답 기다림(입력 중) → 답 도착. */
async function reply(show: (messages: readonly ChatMessage[], busy: boolean) => void) {
  show([theirs("hello"), mine("m1")], true);
  show([theirs("hello"), mine("m1"), theirs("r1")], true);
  show([theirs("hello"), mine("m1"), theirs("r1")], false);
  await flush();
}

test("CPA-UI1. 카드는 종 아이콘 · 제목(인물 이름) · 본문 · Turn on · Not now를 그린다", () => {
  render(
    <ChatPushAskCard
      name={NAME}
      asking={false}
      onTurnOn={() => undefined}
      onNotNow={() => undefined}
    />,
  );
  const card = screen.getByTestId(ids.card);
  expect(card.textContent).toContain(`Get a ping when ${NAME} texts you?`);
  expect(card.textContent).toContain(
    "I sometimes message first — about once a day, in the evening.",
  );
  expect(
    within(screen.getByTestId(ids.turnOn)).getByTestId("ui-lynx-button-label").textContent,
  ).toBe("Turn on");
  expect(
    within(screen.getByTestId(ids.notNow)).getByTestId("ui-lynx-button-label").textContent,
  ).toBe("Not now");
  expect(card.querySelector("svg")).not.toBeNull();
});

test("CPA-UI2. 카드 글은 한 요소로 낭독되고 두 단추는 각자 버튼이다 · 묻는 동안 단추는 눌리지 않는다", () => {
  const onTurnOn = vi.fn();
  const view = render(
    <ChatPushAskCard name={NAME} asking={false} onTurnOn={onTurnOn} onNotNow={() => undefined} />,
  );
  const label = screen.getByTestId(`${ids.card}-text`);
  expect(label.getAttribute("accessibility-label")).toBe(
    `Get a ping when ${NAME} texts you? I sometimes message first — about once a day, in the evening.`,
  );
  expect(
    within(screen.getByTestId(ids.turnOn))
      .getByTestId("ui-lynx-button")
      .getAttribute("accessibility-traits"),
  ).toBe("button");
  view.rerender(
    <ChatPushAskCard name={NAME} asking={true} onTurnOn={onTurnOn} onNotNow={() => undefined} />,
  );
  tap(ids.turnOn);
  expect(onTurnOn).not.toHaveBeenCalled();
});

test("CPA-UI3. 켠 뒤 한 줄 「Notifications on — {name} will ping you.」 — 한 요소로 낭독", () => {
  render(<ChatPushAskOn name={NAME} />);
  const line = screen.getByTestId(ids.on);
  expect(line.textContent).toBe(`Notifications on — ${NAME} will ping you.`);
  expect(line.getAttribute("accessibility-label")).toBe(
    `Notifications on — ${NAME} will ping you.`,
  );
});

test("CPA-UI4. 방을 열 때의 기록 · 보내기 전에는 묻지 않고, 보낸 말에 첫 답이 다 오면 한 번 묻고 카드를 세운다 · shown 이벤트", async () => {
  const { port } = fakePort({ show: true, count: 1 });
  const { events, show } = mount(port);
  await flush();
  show([theirs("hello"), mine("m1")], true);
  show([theirs("hello"), mine("m1"), theirs("r1")], true);
  await flush();
  expect(port.due).not.toHaveBeenCalled();
  expect(screen.queryByTestId(ids.card)).toBeNull();

  show([theirs("hello"), mine("m1"), theirs("r1")], false);
  await flush();
  expect(port.due).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId(ids.card)).toBeInTheDocument();
  expect(events).toEqual([
    expect.objectContaining({
      name: "chat_push_ask_shown",
      surface: "chat",
      characterId: "owner",
      count: "1",
    }),
  ]);

  // 같은 입장의 두 번째 답에는 다시 묻지 않는다.
  show([theirs("hello"), mine("m1"), theirs("r1"), mine("m2")], true);
  show([theirs("hello"), mine("m1"), theirs("r1"), mine("m2"), theirs("r2")], false);
  await flush();
  expect(port.due).toHaveBeenCalledTimes(1);
});

test("CPA-UI5. Turn on → 묻는 동안 카드 그대로 · 허용이면 한 줄로 접히고 tapped · answered(allowed)", async () => {
  const { port, answer } = fakePort({ show: true, count: 2 }, "allowed");
  const { events, show } = mount(port);
  await reply(show);
  tap(ids.turnOn);
  expect(port.turnOn).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId(ids.card)).toBeInTheDocument();
  tap(ids.turnOn);
  expect(port.turnOn).toHaveBeenCalledTimes(1);
  await answer();
  await flush();
  expect(screen.queryByTestId(ids.card)).toBeNull();
  expect(screen.getByTestId(ids.on).textContent).toBe(`Notifications on — ${NAME} will ping you.`);
  expect(events.map((event) => event.name)).toEqual([
    "chat_push_ask_shown",
    "chat_push_ask_tapped",
    "chat_push_ask_answered",
  ]);
  expect(events[1]).toEqual(expect.objectContaining({ choice: "turn_on", characterId: "owner" }));
  expect(events[2]).toEqual(expect.objectContaining({ result: "allowed", characterId: "owner" }));
});

test("CPA-UI6. Turn on → 거절이면 카드가 사라지고 answered(denied) · 결과를 모르면 사라지기만 한다", async () => {
  const denied = fakePort({ show: true, count: 1 }, "denied");
  const first = mount(denied.port);
  await reply(first.show);
  tap(ids.turnOn);
  await denied.answer();
  await flush();
  expect(screen.queryByTestId(ids.card)).toBeNull();
  expect(screen.queryByTestId(ids.on)).toBeNull();
  expect(first.events[first.events.length - 1]).toEqual(
    expect.objectContaining({ name: "chat_push_ask_answered", result: "denied" }),
  );
  cleanup();

  const unknown = fakePort({ show: true, count: 1 }, null);
  const second = mount(unknown.port);
  await reply(second.show);
  tap(ids.turnOn);
  await unknown.answer();
  await flush();
  expect(screen.queryByTestId(ids.card)).toBeNull();
  expect(second.events.map((event) => event.name)).toEqual([
    "chat_push_ask_shown",
    "chat_push_ask_tapped",
  ]);
});

test("CPA-UI7. Not now → 카드가 사라지고 tapped(not_now) — 시스템 창은 없다", async () => {
  const { port } = fakePort({ show: true, count: 1 });
  const { events, show } = mount(port);
  await reply(show);
  tap(ids.notNow);
  expect(screen.queryByTestId(ids.card)).toBeNull();
  expect(port.turnOn).not.toHaveBeenCalled();
  expect(events[events.length - 1]).toEqual(
    expect.objectContaining({ name: "chat_push_ask_tapped", choice: "not_now" }),
  );
});

test("CPA-UI8. 포트가 「없음」이라 답하거나 포트가 없으면(손님) 아무것도 그리지 않고 이벤트도 없다", async () => {
  const { port } = fakePort({ show: false });
  const first = mount(port);
  await reply(first.show);
  expect(port.due).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId(ids.card)).toBeNull();
  expect(first.events).toEqual([]);
  cleanup();

  const second = mount(null);
  await reply(second.show);
  expect(screen.queryByTestId(ids.card)).toBeNull();
  expect(second.events).toEqual([]);
});
