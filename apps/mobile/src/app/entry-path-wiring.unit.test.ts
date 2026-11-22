import { beforeEach, expect, test, vi } from "vitest";

import {
  entryBasicsSkippedEvent,
  entryBasicsStepCompletedEvent,
  entryPathSelectedEvent,
  type EntryEvent,
} from "../lib/entry-flow";
import { entryPathWiring } from "./entry-path-wiring";
import type { NavAction } from "./nav-state";

// `unit` 계층: 여정 입장의 두 길 · 기초 세 걸음의 이벤트 · 전이 순서(ADR-0176).

const syncMock = vi.hoisted(() => vi.fn(async (_options: { ask: boolean }) => undefined));
vi.mock("./push-wiring", () => ({ syncPushDevice: syncMock }));

let log: (EntryEvent | NavAction)[];
const wiring = () =>
  entryPathWiring({
    entryEventSink: (event) => void log.push(event),
    dispatch: (action) => void log.push(action),
  });

const viewed = (screen: string) => ({ name: "entry_screen_viewed", screen });
const pushed = (name: string) => ({ type: "push", screen: { name } });
const entered = [{ name: "entry_completed" }, { type: "enterApp" }];

beforeEach(() => {
  log = [];
  syncMock.mockClear();
});

test("EP1. 바로 입장 → 선택 → 완주 → enterApp, 알림은 묻지 않고 토큰만 맞춘다", () => {
  wiring().onSelectEntryPath("story");

  expect(log).toEqual([{ name: "entry_path_selected", path: "story" }, ...entered]);
  expect(syncMock).toHaveBeenCalledExactlyOnceWith({ ask: false });
});

test("EP2. 기초부터 → 선택 → 글자 화면. 완주 · 토큰 동기화는 아직 0", () => {
  wiring().onSelectEntryPath("basics");

  expect(log).toEqual([
    { name: "entry_path_selected", path: "basics" },
    viewed("entry-basics-letters"),
    pushed("entry-basics-letters"),
  ]);
  expect(syncMock).not.toHaveBeenCalled();
});

test("EP3. 글자를 끝내면 합치기로", () => {
  wiring().onCompleteBasicsStep("letters");

  expect(log).toEqual([
    { name: "entry_basics_step_completed", step: "letters" },
    viewed("entry-basics-compose"),
    pushed("entry-basics-compose"),
  ]);
});

test("EP4. 합치기를 끝내면 준비 완료로", () => {
  wiring().onCompleteBasicsStep("compose");

  expect(log).toEqual([
    { name: "entry_basics_step_completed", step: "compose" },
    viewed("entry-basics-ready"),
    pushed("entry-basics-ready"),
  ]);
});

test("EP5. 준비 완료의 단추가 완주다", () => {
  wiring().onCompleteBasicsStep("ready");

  expect(log).toEqual([{ name: "entry_basics_step_completed", step: "ready" }, ...entered]);
  expect(syncMock).toHaveBeenCalledExactlyOnceWith({ ask: false });
});

test.each(["letters", "compose"] as const)("EP6. %s의 Skip은 곧바로 완주다", (step) => {
  wiring().onSkipBasics(step);

  expect(log).toEqual([{ name: "entry_basics_skipped", step }, ...entered]);
  expect(syncMock).toHaveBeenCalledExactlyOnceWith({ ask: false });
});

test("EP7. 뒤로는 한 칸이고 이벤트가 없다", () => {
  wiring().onBasicsBack();

  expect(log).toEqual([{ type: "back" }]);
});

test("EP8. 이벤트는 받은 값을 그대로 싣는다", () => {
  expect(entryPathSelectedEvent("basics")).toEqual({ name: "entry_path_selected", path: "basics" });
  expect(entryBasicsStepCompletedEvent("ready")).toEqual({
    name: "entry_basics_step_completed",
    step: "ready",
  });
  expect(entryBasicsSkippedEvent("compose")).toEqual({
    name: "entry_basics_skipped",
    step: "compose",
  });
});
