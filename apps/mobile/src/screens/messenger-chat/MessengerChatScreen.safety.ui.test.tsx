import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { fixtureRoom, makeSource, mountChat, seedOf, tapButtonIn } from "./chat-ui.test-support";
import type { ChatFixtureSeed, ChatSource, ChatThread } from "./chat-source.contract";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(SU-UI1 ~ UI10): 방의 법 · 안전 UI(ADR-0125) — 생년 시트 · 고지 줄 · 위기 카드 · 막힌 입력 줄 · 사이드바 생년 줄.

const tap = (testId: string) =>
  act(() => {
    fireEvent.tap(screen.getByTestId(testId), {});
  });
const continueId = "ui-lynx-bottom-sheet-action-continue";
const thisYear = new Date().getFullYear();
const unasked = (seed: ChatFixtureSeed): ChatFixtureSeed => ({ rooms: seed.rooms });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("SU-UI1 생년을 묻지 않았으면 방을 열자마자 생년 시트가 뜨고, 고르기 전에는 Continue가 꺼져 있다", () => {
  mountChat({ seed: unasked(seedOf(fixtureRoom("mina"))) });
  // 설명은 시트 안에 직접 그립니다(시트 description 자리는 기기에서 그려지지 않았다).
  expect(screen.getByTestId(ids.birthYearSheet).textContent).toContain("We use it to keep chats");
  expect(screen.queryByTestId("ui-lynx-bottom-sheet-description")).toBeNull();
  // 연도 줄을 담은 스크롤 칸에는 낭독 이름이 없어야 Android가 안의 줄을 따로 내보입니다(기기 확인).
  const list = screen.getByTestId(ids.birthYearOption(thisYear)).parentElement;
  expect(list?.getAttribute("accessibility-label") ?? null).toBeNull();
  expect(screen.getByTestId(ids.birthYearSheet)).toBeTruthy();
  expect(screen.getByTestId(ids.birthYearOption(thisYear))).toBeTruthy();
  expect(screen.getByTestId(ids.birthYearOption(thisYear - 100))).toBeTruthy();
  expect(screen.queryByTestId(ids.birthYearOption(thisYear - 101))).toBeNull();
  expect(
    within(screen.getByTestId(continueId))
      .getByTestId("ui-lynx-button")
      .getAttribute("data-disabled"),
  ).toBe("true");
});

test("SU-UI2 연도를 고르고 Continue → 출처에 저장되고 시트가 닫힌다", () => {
  const { source } = mountChat({ seed: unasked(seedOf(fixtureRoom("mina"))) });
  tap(ids.birthYearOption(2001));
  expect(screen.getByTestId(ids.birthYearOption(2001)).getAttribute("data-selected")).toBe("true");
  act(() => {
    tapButtonIn(continueId);
  });
  expect(source.snapshot().birthYear).toEqual({ kind: "set", year: 2001 });
  expect(screen.queryByTestId(ids.birthYearSheet)).toBeNull();
});

test("SU-UI3 Skip → skipped로 저장되고 시트가 닫힌다. 이미 답했으면 시트가 뜨지 않는다", () => {
  const { source } = mountChat({ seed: unasked(seedOf(fixtureRoom("mina"))) });
  act(() => {
    tapButtonIn("ui-lynx-bottom-sheet-action-skip");
  });
  expect(source.snapshot().birthYear).toEqual({ kind: "skipped" });
  expect(screen.queryByTestId(ids.birthYearSheet)).toBeNull();
});

test("SU-UI4 방을 열자마자 뜬 시트에서 시스템 뒤로 → 답하지 않은 채 방을 나간다", () => {
  const { source, onExit } = mountChat({ seed: unasked(seedOf(fixtureRoom("mina"))) });
  act(() => {
    backHandlers.runTop();
  });
  expect(onExit).toHaveBeenCalledTimes(1);
  expect(source.snapshot().birthYear).toEqual({ kind: "unasked" });
});

test("SU-UI5 고지 셋은 로그 안 회색 줄로, 이름이 든 문장 그대로 읽힌다", () => {
  mountChat({
    seed: seedOf(
      fixtureRoom("mina", {
        counterpart: { id: "mina", name: "Mina", avatarPath: null },
        messages: [
          { kind: "notice", notice: "ai-disclosure", minutesAgo: 10 },
          { kind: "notice", notice: "minor-notice", minutesAgo: 10 },
          { kind: "text", from: "them", text: { ko: "안녕", en: "Hi" }, minutesAgo: 9 },
          { kind: "notice", notice: "break-reminder", minutesAgo: 1 },
        ],
      }),
    ),
  });
  const labels = screen
    .getAllByTestId(ids.notice)
    .map((row) => row.getAttribute("accessibility-label"));
  expect(labels).toEqual([
    "Mina is an AI character. Replies are written by AI.",
    "This chat may not be suitable for everyone under 18.",
    "You've been chatting for 3 hours. Time for a short break? Reminder: Mina is AI.",
  ]);
});

test("SU-UI6 위기 카드: 기관마다 Call · Website, 누르면 tel: · https 주소를 호스트로 연다", () => {
  const open = vi.fn();
  vi.stubGlobal("NativeModules", { ExternalLinkModule: { open } });
  mountChat({
    seed: seedOf(
      fixtureRoom("mina", {
        messages: [
          {
            kind: "crisis",
            resources: [
              { name: "Line A", phone: "988", url: "https://a.example", hours: "24/7" },
              { name: "Chat B", phone: null, url: "https://b.example", hours: null },
            ],
            minutesAgo: 1,
          },
        ],
      }),
    ),
  });
  const card = screen.getByTestId(ids.crisis);
  expect(card.textContent).toContain("Line A");
  expect(card.textContent).toContain("24/7");
  const calls = screen.getAllByTestId(ids.crisisCall);
  const webs = screen.getAllByTestId(ids.crisisWeb);
  expect(calls).toHaveLength(1);
  expect(webs).toHaveLength(2);
  expect(calls[0]?.getAttribute("accessibility-label")).toBe("Call Line A");
  act(() => {
    fireEvent.tap(calls[0] as Element, {});
  });
  act(() => {
    fireEvent.tap(webs[1] as Element, {});
  });
  expect(open.mock.calls.map((call) => call[0])).toEqual(["tel:988", "https://b.example"]);
});

test("SU-UI7 입력이 막힌 방은 입력 줄 · 기능 줄 대신 상태 줄 하나만 서고, 로그는 그대로다", () => {
  mountChat({
    seed: seedOf(
      fixtureRoom("mina", { inputBlock: { kind: "temporarily-blocked", inMinutes: 30 } }),
    ),
  });
  expect(screen.getByTestId(ids.blocked).textContent).toContain("Chat paused until");
  expect(screen.queryByTestId(ids.composer)).toBeNull();
  expect(screen.queryByTestId(ids.featureRow)).toBeNull();
  expect(screen.queryByTestId(ids.blockedChangeYear)).toBeNull();
  expect(screen.getByTestId(ids.log).textContent).toContain("오늘 뭐 해요?");
});

test("SU-UI8 연령 제한 줄의 문구, Change birth year는 지금 생년이 골라진 시트를 연다", () => {
  mountChat({
    seed: {
      ...seedOf(fixtureRoom("mina", { inputBlock: { kind: "age-restricted" } })),
      birthYear: { kind: "set", year: 2012 },
    },
  });
  expect(screen.getByTestId(ids.blocked).textContent).toContain(
    "Chat isn't available for your age yet",
  );
  tap(ids.blockedChangeYear);
  expect(screen.getByTestId(ids.birthYearSheet)).toBeTruthy();
  expect(screen.getByTestId(ids.birthYearOption(2012)).getAttribute("data-selected")).toBe("true");
});

test("SU-UI8b 하루 시간 상한 줄은 다시 쓸 수 있는 시각을 보인다", () => {
  mountChat({
    seed: seedOf(fixtureRoom("mina", { inputBlock: { kind: "usage-time-limit", inMinutes: 60 } })),
  });
  const text = screen.getByTestId(ids.blocked).textContent ?? "";
  expect(text).toContain("Today's chat time is up");
  expect(text).toMatch(/You can chat again at \d{1,2}:\d{2} (AM|PM)\./);
});

test("SU-UI11 탭 요소는 Android 접근성 탭을 켠다(위기 Call · Website · 연도 줄 · Change birth year)", () => {
  mountChat({
    seed: unasked(
      seedOf(
        fixtureRoom("mina", {
          inputBlock: { kind: "age-restricted" },
          messages: [
            {
              kind: "crisis",
              resources: [{ name: "Line A", phone: "988", url: "https://a.example", hours: null }],
              minutesAgo: 1,
            },
          ],
        }),
      ),
    ),
  });
  const tappables = [
    screen.getByTestId(ids.crisisCall),
    screen.getByTestId(ids.crisisWeb),
    screen.getByTestId(ids.blockedChangeYear),
    screen.getByTestId(ids.birthYearOption(2000)),
  ];
  for (const element of tappables) {
    const name = element.getAttribute("data-testid") ?? "";
    expect(element.getAttribute("accessibility-enable-tap"), name).toBe("true");
    // Android는 납작해진(flatten) 요소를 접근성 트리에서 지웁니다 — 기기 확인(ADR-0040 · ADR-0125).
    expect(element.getAttribute("flatten"), name).toBe("false");
  }
});

test("SU-UI12 열 수 없는 전화 번호면 Call 단추를 그리지 않는다", () => {
  mountChat({
    seed: seedOf(
      fixtureRoom("mina", {
        messages: [
          {
            kind: "crisis",
            resources: [{ name: "Line A", phone: "(02) 8804", url: null, hours: null }],
            minutesAgo: 1,
          },
        ],
      }),
    ),
  });
  expect(screen.getByTestId(ids.crisis).textContent).toContain("Line A");
  expect(screen.queryByTestId(ids.crisisCall)).toBeNull();
});

test("SU-UI9 사이드바 생년 줄은 지금 값을 보이고, 누르면 그 연도가 골라진 시트가 열리며 닫으면 사이드바로 돌아간다", () => {
  mountChat({ seed: { ...seedOf(fixtureRoom("mina")), birthYear: { kind: "set", year: 1999 } } });
  tap(ids.settings);
  const row = screen.getByTestId(ids.sidebarBirthYear);
  expect(row.getAttribute("accessibility-label")).toBe("Birth year, 1999");
  tap(ids.sidebarBirthYear);
  expect(screen.getByTestId(ids.birthYearOption(1999)).getAttribute("data-selected")).toBe("true");
  act(() => {
    backHandlers.runTop();
  });
  expect(screen.queryByTestId(ids.birthYearSheet)).toBeNull();
  expect(screen.getByTestId(ids.sidebar)).toBeTruthy();
});

test("SU-UI10 건너뛴 생년은 사이드바에 Not set으로 보인다", () => {
  mountChat({ seed: { ...seedOf(fixtureRoom("mina")), birthYear: { kind: "skipped" } } });
  tap(ids.settings);
  expect(screen.getByTestId(ids.sidebarBirthYear).getAttribute("accessibility-label")).toBe(
    "Birth year, Not set",
  );
});

test("SU-UI13 방 도중에 막히면 열린 키보드를 접고, 다음 뒤로가기는 바로 방을 나간다", () => {
  const inner = makeSource(seedOf(fixtureRoom("mina")));
  let blocked = false;
  const listeners = new Set<() => void>();
  let cached: { base: ChatThread | null; out: ChatThread | null; blocked: boolean } | null = null;
  const source: ChatSource = {
    ...inner,
    thread: (roomId) => {
      const base = inner.thread(roomId);
      if (cached === null || cached.base !== base || cached.blocked !== blocked) {
        const out =
          base === null || !blocked
            ? base
            : { ...base, inputBlock: { kind: "age-restricted" as const } };
        cached = { base, out, blocked };
      }
      return cached.out;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      const off = inner.subscribe(listener);
      return () => {
        listeners.delete(listener);
        off();
      };
    },
  };
  const { onExit } = mountChat({ source });
  tap(ids.field);
  expect(screen.getByTestId(ids.slot)).toBeTruthy();

  act(() => {
    blocked = true;
    for (const listener of listeners) listener();
  });
  expect(screen.getByTestId(ids.blocked)).toBeTruthy();
  act(() => {
    backHandlers.runTop();
  });
  expect(onExit).toHaveBeenCalledTimes(1);
});

test("SU-UI12 웹 주소가 열 수 없는 꼴(http 등)이면 Website 단추를 그리지 않는다 — 전화와 같다(PR #412 리뷰)", () => {
  mountChat({
    seed: seedOf(
      fixtureRoom("mina", {
        messages: [
          {
            kind: "crisis",
            resources: [{ name: "Line C", phone: null, url: "http://c.example", hours: null }],
            minutesAgo: 1,
          },
        ],
      }),
    ),
  });
  expect(screen.getByTestId(ids.crisis).textContent).toContain("Line C");
  expect(screen.queryAllByTestId(ids.crisisWeb)).toHaveLength(0);
});
