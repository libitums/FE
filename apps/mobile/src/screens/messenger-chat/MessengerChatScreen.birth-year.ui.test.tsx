import { act, fireEvent, screen } from "@lynx-js/react/testing-library";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { backHandlers } from "../../lib/back-handler";
import { createFixtureChatSource } from "./chat-fixture-source";
import { parseBirthYear } from "./chat-local-stores";
import { fixtureRoom, imageUrlOf, mountChat, seedOf, tapButtonIn } from "./chat-ui.test-support";
import type { ChatFixtureSeed } from "./chat-source.contract";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(SU-UI13 ~ UI18): 생년 시트(ADR-0125 개정 2026-11-27). 맨 위 올해 줄에서 열면 대충 누른 탭이 0세로
// 저장됐습니다 — 고른 연도가 없으면 목록 가운데에서, 있으면 그 연도에서 엽니다. 「Skip for now」를 걷었습니다 — 연도를
// 골라 Continue해야 대화를 시작하고, 닫으면(X · 바깥 탭 · 뒤로) 답하지 않은 채 방을 나갑니다.

// 시각을 고정합니다 — 해가 바뀌는 순간에 돌아도 목록과 기대값이 같은 해를 봅니다(PR #659 리뷰).
const thisYear = 2026;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 27, 9, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

const unasked = (seed: ChatFixtureSeed): ChatFixtureSeed => ({ rooms: seed.rooms });
const listOf = (year: number) => screen.getByTestId(ids.birthYearOption(year)).parentElement;
const selectedOf = (year: number) =>
  screen.getByTestId(ids.birthYearOption(year)).getAttribute("data-selected");

test("SU-UI13 생년을 묻지 않았으면 시트는 고른 것 없이 목록 가운데(50년 전)에서 열린다", () => {
  mountChat({ seed: unasked(seedOf(fixtureRoom("mina"))) });
  // 가운데 줄(올해 - 50)이 칸 가운데 오도록 그 두 줄 위(인덱스 48)가 칸 맨 위입니다.
  expect(listOf(thisYear)?.getAttribute("initial-scroll-to-index")).toBe("48");
  // 자리만 옮길 뿐 값을 미리 채우지 않습니다(COPPA 중립 연령 확인) — 어느 줄도 골라져 있지 않습니다.
  expect(selectedOf(thisYear)).toBe("false");
  expect(selectedOf(thisYear - 50)).toBe("false");
});

test("SU-UI14 이미 정한 생년을 고치려고 열면 그 연도에서 열린다(막힌 줄의 Change birth year)", () => {
  mountChat({
    seed: {
      ...seedOf(fixtureRoom("mina", { inputBlock: { kind: "age-restricted" } })),
      birthYear: { kind: "set", year: 2012 },
    },
  });
  act(() => {
    fireEvent.tap(screen.getByTestId(ids.blockedChangeYear), {});
  });
  expect(listOf(2012)?.getAttribute("initial-scroll-to-index")).toBe(String(thisYear - 2012 - 2));
  expect(selectedOf(2012)).toBe("true");
});

const skipId = "ui-lynx-bottom-sheet-action-skip";
const closeId = "ui-lynx-bottom-sheet-close";

test("SU-UI15 방을 열자마자 뜬 생년 시트에는 Skip 단추도 「건너뛰면 미성년 설정」 안내도 없다", () => {
  mountChat({ seed: unasked(seedOf(fixtureRoom("mina"))) });
  const sheet = screen.getByTestId(ids.birthYearSheet);
  expect(screen.queryByTestId(skipId)).toBeNull();
  expect(sheet.textContent).not.toContain("Skip");
  // 고르기 전에 「어리면 못 쓴다」류 안내 · 나이 기준을 보이지 않습니다(COPPA 중립 연령 확인).
  expect(sheet.textContent).not.toContain("under");
});

test("SU-UI16 닫기(X)를 누르면 답하지 않은 채 방을 나간다 — 시트만 닫히고 방에 남지 않는다", () => {
  const { source, onExit } = mountChat({ seed: unasked(seedOf(fixtureRoom("mina"))) });
  act(() => {
    fireEvent.tap(screen.getByTestId(closeId), {});
  });
  expect(onExit).toHaveBeenCalledTimes(1);
  expect(source.snapshot().birthYear).toEqual({ kind: "unasked" });
});

test("SU-UI17 바깥(어둠막)을 눌러도 · 시스템 뒤로도 방을 나간다", () => {
  const first = mountChat({ seed: unasked(seedOf(fixtureRoom("mina"))) });
  act(() => {
    fireEvent.tap(screen.getByTestId("ui-lynx-bottom-sheet-scrim"), {});
  });
  expect(first.onExit).toHaveBeenCalledTimes(1);
  first.view.unmount();
  const second = mountChat({ seed: unasked(seedOf(fixtureRoom("mina"))) });
  act(() => {
    backHandlers.runTop();
  });
  expect(second.onExit).toHaveBeenCalledTimes(1);
});

test("SU-UI18 옛 앱에서 건너뛴 기록(skipped)이 기기에 있어도 방을 열면 시트가 다시 뜬다", () => {
  const source = createFixtureChatSource({
    imageUrlOf,
    seed: unasked(seedOf(fixtureRoom("mina"))),
    now: () => Date.now(),
    birthYearStore: { read: () => parseBirthYear({ kind: "skipped" }), write: () => undefined },
  });
  mountChat({ source });
  expect(screen.getByTestId(ids.birthYearSheet)).toBeTruthy();
  act(() => {
    fireEvent.tap(screen.getByTestId(ids.birthYearOption(1990)), {});
  });
  act(() => {
    tapButtonIn("ui-lynx-bottom-sheet-action-continue");
  });
  expect(source.snapshot().birthYear).toEqual({ kind: "set", year: 1990 });
  expect(screen.queryByTestId(ids.birthYearSheet)).toBeNull();
  expect(screen.getByTestId(ids.field)).toBeTruthy();
});

test("SU-UI19 사이드바에서 연 생년 시트는 닫으면 사이드바로 돌아가고 방을 나가지 않는다", () => {
  const { onExit } = mountChat({ seed: seedOf(fixtureRoom("mina")) });
  act(() => {
    fireEvent.tap(screen.getByTestId(ids.settings), {});
  });
  act(() => {
    fireEvent.tap(screen.getByTestId(ids.sidebarBirthYear), {});
  });
  expect(screen.queryByTestId(skipId)).toBeNull();
  act(() => {
    fireEvent.tap(screen.getByTestId(closeId), {});
  });
  expect(screen.queryByTestId(ids.birthYearSheet)).toBeNull();
  expect(screen.getByTestId(ids.sidebar)).toBeTruthy();
  expect(onExit).not.toHaveBeenCalled();
});
