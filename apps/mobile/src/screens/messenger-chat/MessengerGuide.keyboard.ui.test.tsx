import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import type { EpisodeIntroEvent } from "../episode-intro/episode-intro.contract";
import { uiCopyFor } from "../../lib/ui-copy";
import { focusPhoneInput } from "./chat-input-focus";
import { createFixtureChatSource } from "./chat-fixture-source";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import type { ChatRemote } from "./chat-remote.contract";
import { clearBackHandlers, mountChat, slotContent, slotHeight } from "./chat-ui.test-support";
import { companionSeed } from "./companion-roster";
import type { KeyboardHeightStore } from "./keyboard-ports";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import type { GuidePart, GuideStore } from "./messenger-guide";

// `ui` 계층(KG-UI1 ~ UI7): 덕수쌤 방 안내의 키보드 두 갈래 단계(ADR-0190, 시안 「채팅 두 언어 안내」 1 · 1).
// 휴대폰 키보드를 먼저 열어 높이를 재고 → Next → Hangul keys(잰 높이 그대로) → Next → 전구. 교정 안내(chat) 단계는 없다.

vi.mock("./chat-input-focus", () => ({
  focusPhoneInput: vi.fn<() => void>(),
  blurPhoneInput: vi.fn<() => void>(),
  clearPhoneInput: vi.fn<() => void>(),
  restoreAccessibilityFocus: vi.fn<(testId: string) => void>(),
}));

const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));
const en = uiCopyFor("en").messengerChat.guide;

function memoryStore(seen: readonly GuidePart[] = []) {
  const parts = new Set<GuidePart>(seen);
  const store: GuideStore = {
    unseen: (part) => !parts.has(part),
    markSeen: (part) => {
      parts.add(part);
    },
  };
  return { store, seen: () => [...parts] };
}

function serverSource() {
  const remote: ChatRemote = {
    loadHistory: async () => ({
      messages: [
        { id: "g#0", at: 1, kind: "text", from: "them", text: { ko: "안녕하세요!", en: "Hi!" } },
      ],
      corrections: {},
      ideas: null,
    }),
    greet: () => new Promise(() => undefined),
    openTurn: () => ({ cancel: () => undefined }),
  };
  return createFixtureChatSource({
    imageUrlOf: () => null,
    seed: { ...companionSeed(), birthYear: { kind: "set", year: 2000 } },
    timers: fakeTimers(),
    remote,
  });
}

function heightStore(initial: number | null = null) {
  let value = initial;
  const write = vi.fn<(height: number) => void>((height) => {
    value = height;
  });
  const store: KeyboardHeightStore = { read: () => value, write };
  return { store, write };
}

let events: EpisodeIntroEvent[];
const keyboardEvents = () =>
  events.flatMap((event) =>
    event.name === "messenger_guide_keyboard" ? [`${event.stage}:${event.action}`] : [],
  );
const finishedParts = () =>
  events.flatMap((event) => (event.name === "messenger_guide_finished" ? [event.part] : []));

const coach = () => screen.getByTestId(ids.guideCoach);
const field = () => screen.getByTestId(ids.field).getAttribute("data-keyboard");
const next = () =>
  act(() => {
    fireEvent.tap(screen.getByTestId(ids.guideCoachNext), { eventType: "catchEvent" });
  });

/** 입력 칸이 휴대폰 키보드 높이를 알립니다(Lynx `keyboardheightchange`) — 내려가면 0. */
function keyboardHeight(height: number): void {
  const EventConstructor = screen.getByTestId(ids.input).ownerDocument.defaultView?.CustomEvent;
  if (EventConstructor === undefined) throw new Error("CustomEvent is unavailable");
  const ref = lynx.createSelectorQuery().select(`[data-testid="${ids.input}"]`);
  act(() => {
    fireEvent(
      ref as unknown as Element,
      new EventConstructor("bindEvent:keyboardheightchange", { detail: { height } }),
    );
  });
}

async function open(seen: readonly GuidePart[] = [], store = heightStore(300).store) {
  const memory = memoryStore(seen);
  mountChat({
    source: serverSource(),
    roomId: "duksu",
    guideStore: memory.store,
    store,
    eventSink: (event) => events.push(event),
  });
  await wait();
  await wait(20);
  return memory;
}

beforeEach(() => {
  vi.useRealTimers();
  vi.mocked(focusPhoneInput).mockClear();
  events = [];
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
});

describe("키보드 단계 — 휴대폰 키보드 먼저", () => {
  test("KG-UI1 안내 첫 화면은 키보드 단계(phone) — 입력 칸에 초점을 줘 휴대폰 키보드를 열고, 말풍선은 Phone keyboard 칸을 가리킨다", async () => {
    await open();
    expect(coach().getAttribute("data-step")).toBe("keyboard");
    expect(coach().getAttribute("data-stage")).toBe("phone");
    expect(coach().textContent).toContain(en.keyboard.phone.title);
    expect(coach().textContent).toContain(en.keyboard.phone.body);
    expect(coach().textContent).toContain("1 of 2");
    expect(field()).toBe("phone");
    expect(focusPhoneInput).toHaveBeenCalled();
    // 말풍선 꼬리는 토글의 Phone keyboard 칸, 토글 줄은 막 위에 밝게(안내 안의 같은 토글).
    expect(screen.getByTestId(ids.guideTail).getAttribute("data-target")).toBe("phone");
    const toggle = within(coach()).getByTestId(ids.toggle("phone"));
    expect(toggle.getAttribute("data-selected")).toBe("true");
    expect(screen.getByTestId(ids.guideCoachNext).textContent).toBe("Next");
  });

  test("KG-UI2 Next → Hangul keys(같은 단계 · 같은 번호), 키보드 자리 높이는 잰 값 그대로 → Next → 전구 2 of 2, 키보드는 닫히고 Hangul keys", async () => {
    await open([], heightStore(312).store);
    const measured = slotHeight();
    next();
    expect(coach().getAttribute("data-step")).toBe("keyboard");
    expect(coach().getAttribute("data-stage")).toBe("hangul");
    expect(coach().textContent).toContain(en.keyboard.hangul.title);
    expect(coach().textContent).toContain(en.keyboard.hangul.body);
    expect(coach().textContent).toContain("1 of 2");
    expect(field()).toBe("learning");
    expect(slotContent()).toBe("learning-keyboard");
    expect(slotHeight()).toBe(measured);
    expect(screen.getByTestId(ids.guideTail).getAttribute("data-target")).toBe("learning");
    next();
    expect(coach().getAttribute("data-step")).toBe("ideas");
    expect(coach().textContent).toContain("2 of 2");
    expect(field()).toBe("learning");
    expect(slotContent()).toBe("closed");
  });

  test("KG-UI3 막은 토글 줄 위에서 끝나고 자리 높이를 따른다 — 휴대폰 화면은 키보드 위까지, Hangul keys 화면은 키보드까지 덮는다", async () => {
    await open([], heightStore(280).store);
    const below = () => screen.getByTestId(ids.guideKeyboardSlot);
    expect(below().getAttribute("data-height")).toBe(slotHeight());
    expect(below().getAttribute("data-dim")).toBe("false");
    next();
    expect(below().getAttribute("data-height")).toBe(slotHeight());
    expect(below().getAttribute("data-dim")).toBe("true");
  });

  test("KG-UI4 안내 안의 토글을 직접 눌러도 바뀐다 — 말풍선이 그 칸을 따라가고 switched가 남는다", async () => {
    await open();
    act(() => {
      fireEvent.tap(within(coach()).getByTestId(ids.toggle("learning")), {});
    });
    expect(coach().getAttribute("data-stage")).toBe("hangul");
    expect(field()).toBe("learning");
    act(() => {
      fireEvent.tap(within(coach()).getByTestId(ids.toggle("phone")), {});
    });
    expect(coach().getAttribute("data-stage")).toBe("phone");
    expect(field()).toBe("phone");
    expect(keyboardEvents()).toEqual([
      "phone:shown",
      "hangul:switched",
      "hangul:shown",
      "phone:switched",
    ]);
  });

  test("KG-UI5 이벤트 — 화면마다 shown · next, 끝나면 finished room", async () => {
    await open();
    next();
    next();
    next();
    expect(keyboardEvents()).toEqual(["phone:shown", "phone:next", "hangul:shown", "hangul:next"]);
    expect(finishedParts()).toEqual(["room"]);
  });

  test("KG-UI6 안내를 이미 본 사람 — 키보드 단계만 한 번(New, 마지막은 Got it), 끝내면 keyboard를 남기고 다시 안 뜬다", async () => {
    const memory = await open(["list", "room"]);
    expect(coach().getAttribute("data-step")).toBe("keyboard");
    expect(coach().textContent).toContain(en.newTag);
    next();
    expect(screen.getByTestId(ids.guideCoachNext).textContent).toBe("Got it");
    next();
    expect(screen.queryByTestId(ids.guideCoach)).toBeNull();
    expect(memory.seen()).toContain("keyboard");
    expect(finishedParts()).toEqual(["keyboard"]);
    expect(slotContent()).toBe("closed");
    cleanup();
    await open(["list", "room", "keyboard"]);
    expect(screen.queryByTestId(ids.guideCoach)).toBeNull();
  });

  test("KG-UI7 새 사용자가 끝까지 보면 keyboard도 본 것으로 남는다 — 교정 안내(chat) 단계는 없다", async () => {
    const memory = await open();
    const steps: string[] = [];
    while (screen.queryByTestId(ids.guideCoach) !== null) {
      steps.push(coach().getAttribute("data-step") ?? "");
      next();
    }
    expect(steps).toEqual(["keyboard", "keyboard", "ideas"]);
    expect(memory.seen()).toEqual(expect.arrayContaining(["room", "list", "keyboard"]));
  });
});

describe("키보드 단계 — 휴대폰 키보드가 내려가면(Android 뒤로가기 등, ADR-0190 개정 2026-11-24)", () => {
  test("KG-UI9 휴대폰 키보드 화면에서 키보드가 내려가면(높이 0) Next와 같은 Hangul keys 화면 — 잰 높이 그대로, 0은 저장하지 않는다", async () => {
    const heights = heightStore(300);
    await open([], heights.store);
    keyboardHeight(312);
    const measured = slotHeight();
    keyboardHeight(0);
    expect(coach().getAttribute("data-step")).toBe("keyboard");
    expect(coach().getAttribute("data-stage")).toBe("hangul");
    expect(coach().textContent).toContain(en.keyboard.hangul.title);
    expect(coach().textContent).toContain("1 of 2");
    expect(field()).toBe("learning");
    expect(slotContent()).toBe("learning-keyboard");
    expect(slotHeight()).toBe(measured);
    expect(screen.getByTestId(ids.guideTail).getAttribute("data-target")).toBe("learning");
    expect(within(coach()).getByTestId(ids.toggle("learning")).getAttribute("data-selected")).toBe(
      "true",
    );
    expect(heights.write.mock.calls).toEqual([[312]]);
    expect(keyboardEvents()).toEqual(["phone:shown", "phone:hidden", "hangul:shown"]);
  });

  test("KG-UI10 Hangul keys 화면 · 키보드가 오르기 전에 온 높이 0은 아무것도 바꾸지 않는다", async () => {
    await open();
    keyboardHeight(0);
    expect(coach().getAttribute("data-stage")).toBe("phone");
    expect(field()).toBe("phone");
    keyboardHeight(300);
    next();
    keyboardHeight(0);
    expect(coach().getAttribute("data-step")).toBe("keyboard");
    expect(coach().getAttribute("data-stage")).toBe("hangul");
    expect(field()).toBe("learning");
    expect(slotContent()).toBe("learning-keyboard");
    expect(keyboardEvents()).toEqual(["phone:shown", "phone:next", "hangul:shown"]);
  });
});

test("KG-UI8 입력 칸 안내 글은 「한국어 또는 내 언어」 — 채팅 방만", async () => {
  await open(["list", "room", "keyboard"]);
  expect(screen.getByTestId(ids.display).textContent).toContain("Korean or English");
  expect(screen.getByTestId(ids.input).getAttribute("placeholder")).toBe("Korean or English");
  expect(uiCopyFor("vi").messengerChat.composer.placeholder).toBe("Tiếng Hàn hoặc tiếng Việt");
});
