import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { MotionProvider } from "@libitums/ui-lynx/motion";

import * as accessibility from "../../lib/accessibility";
import * as inputFocus from "./chat-input-focus";
import * as soundEffects from "../../lib/sound-effects";
import { clearBackHandlers, systemBack } from "./chat-ui.test-support";
import { fakeTimers, type FakeTimers } from "./chat-fixture-timers.test-support";
import { newFriendTestIds as ids, type NewFriendModel } from "./new-friend.contract";
import { NewFriendLayer } from "./NewFriendLayer";

// `ui` 계층(MC2-UI15 · NF-M1 · NF-M2): 아래 화면(여정 맵 — 테스트에선 「결과 화면」 자리 표시) 위 층 — 마운트 후 2000 ms 뒤 typing, +1200 ms 뒤 message(진동 1회 · 낭독) · 움직임 줄이기 600 / 600 ·
// 시트가 보이는 동안 아래 결과 화면은 낭독에서 숨김 · Later / scrim / 시스템 뒤로 → 시트만 닫힘 · 언마운트하면 타이머 0 · 효과음 없음.
// 가정(구현자가 따를 것): 타이머는 `timers` prop으로 주입(기본 맨 식별자 setTimeout), 진동은 `createKeyHaptic()()` 한 번,
// 낭독은 lib/accessibility의 announce, 아래 결과 화면은 `children`을 감싼 view 어딘가의 `accessibility-elements-hidden`.

const keyHaptic = vi.hoisted(() => vi.fn<() => void>());
vi.mock("../../lib/sound-effects", async (importOriginal) => ({
  ...(await importOriginal<typeof soundEffects>()),
  createKeyHaptic: vi.fn<() => () => void>(() => keyHaptic),
  playSound: vi.fn<(name: string) => void>(),
}));
vi.mock("../../lib/accessibility", async (importOriginal) => ({
  ...(await importOriginal<typeof accessibility>()),
  announce: vi.fn<(content: string) => "announced">(() => "announced"),
}));

vi.mock("./chat-input-focus", () => ({
  focusPhoneInput: vi.fn<() => void>(),
  blurPhoneInput: vi.fn<() => void>(),
  clearPhoneInput: vi.fn<() => void>(),
  restoreAccessibilityFocus: vi.fn<(testId: string) => void>(),
}));

const focusCalls = (): ReturnType<typeof vi.fn> => vi.mocked(inputFocus.restoreAccessibilityFocus);
const announce = (): ReturnType<typeof vi.fn> => vi.mocked(accessibility.announce);

const MODEL: NewFriendModel = {
  characterId: "mina",
  roomId: "mina",
  name: "미나",
  faceUrl: "https://cdn/content/images/profiles/mina-casual.webp",
  sceneUrl: "https://cdn/content/images/u03-mina/pre-1.webp",
  episodeOrdinal: 3,
  episodeTitle: "Ikseon guesthouse",
  opening: { ko: "안녕! 나 미나야. 오늘 뭐 했어?", en: "Hi! It's Mina. What did you do today?" },
};

let timers: FakeTimers;
beforeEach(() => {
  vi.clearAllMocks();
  timers = fakeTimers();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
});

function mount(motion: "standard" | "reduced" = "standard", model: NewFriendModel = MODEL) {
  const onReply = vi.fn<() => void>();
  const layer = (
    <NewFriendLayer model={model} onReply={onReply} timers={timers} resultFocusId="result-title">
      <view data-testid="result-screen" />
    </NewFriendLayer>
  );
  const view = render(
    motion === "reduced" ? <MotionProvider motion="reduced">{layer}</MotionProvider> : layer,
  );
  return { onReply, view };
}
const advance = (ms: number): void => {
  act(() => {
    timers.advance(ms);
  });
};
const sheet = (): HTMLElement | null => screen.queryByTestId(ids.sheet);
/** 결과 화면 요소에서 위로 올라가며 accessibility-elements-hidden 값을 찾습니다. */
function resultHidden(): boolean {
  let el: Element | null = screen.getByTestId("result-screen");
  while (el !== null) {
    if (el.getAttribute("accessibility-elements-hidden") === "true") return true;
    el = el.parentElement;
  }
  return false;
}
const tap = (testId: string): void => {
  const el = screen.getByTestId(testId);
  fireEvent.tap(el.querySelector('[data-testid="ui-lynx-button"]') ?? el, {});
};

test("MC2-UI15. 마운트 직후에는 시트가 없고 결과 화면(children)이 그려진다", () => {
  mount();

  expect(sheet()).toBeNull();
  expect(screen.getByTestId("result-screen")).toBeTruthy();
  expect(resultHidden()).toBe(false);
});

test("MC2-UI15. 1999 ms까지 시트가 없고 2000 ms에 typing 시트가 선다", () => {
  mount();

  advance(1999);
  expect(sheet()).toBeNull();
  advance(1);

  expect(sheet()?.getAttribute("data-phase")).toBe("typing");
  expect(screen.getByTestId(ids.typing)).toBeTruthy();
});

test("MC2-UI15. typing 1199 ms 동안은 typing이고 1200 ms째에 message가 서며 진동은 그때 한 번이다", () => {
  mount();
  advance(2000);
  expect(keyHaptic).not.toHaveBeenCalled();

  advance(1199);
  expect(sheet()?.getAttribute("data-phase")).toBe("typing");
  expect(keyHaptic).not.toHaveBeenCalled();
  advance(1);

  expect(sheet()?.getAttribute("data-phase")).toBe("message");
  expect(screen.getByTestId(ids.message).textContent).toContain(MODEL.opening.ko);
  expect(keyHaptic).toHaveBeenCalledTimes(1);
  advance(5000);
  expect(keyHaptic).toHaveBeenCalledTimes(1);
});

test("MC2-UI15. 번역이 비어 있으면 낭독이 쉼표로 끝나지 않는다(a11y N7)", () => {
  mount("standard", { ...MODEL, opening: { ko: MODEL.opening.ko, en: "" } });
  advance(2000);
  advance(1200);

  expect(announce()).toHaveBeenLastCalledWith(`미나: ${MODEL.opening.ko}`);
});

test("MC2-UI15. 낭독: typing → message 순서로 한 번씩 알린다", () => {
  mount();
  advance(2000);
  advance(16);
  expect(announce()).toHaveBeenCalledTimes(1);
  expect(announce()).toHaveBeenNthCalledWith(1, "미나 is typing…");

  advance(1200);

  expect(announce()).toHaveBeenCalledTimes(2);
  expect(announce()).toHaveBeenNthCalledWith(2, `미나: ${MODEL.opening.ko}, ${MODEL.opening.en}`);
});

test("MC2-UI15. 효과음은 없다(진동만)", () => {
  mount();

  advance(3200);

  expect(vi.mocked(soundEffects.playSound)).not.toHaveBeenCalled();
});

test("MC2-UI15. 움직임 줄이기: 600 ms에 typing, 다시 600 ms에 message다", () => {
  mount("reduced");

  advance(599);
  expect(sheet()).toBeNull();
  advance(1);
  expect(sheet()?.getAttribute("data-phase")).toBe("typing");
  advance(599);
  expect(sheet()?.getAttribute("data-phase")).toBe("typing");
  advance(1);

  expect(sheet()?.getAttribute("data-phase")).toBe("message");
});

test("MC2-UI15. 시트가 보이는 동안 아래 결과 화면은 낭독에서 숨는다", () => {
  mount();
  expect(resultHidden()).toBe(false);

  advance(2000);

  expect(resultHidden()).toBe(true);
});

test("MC2-UI15. scrim 탭: 시트만 사라지고 결과 화면은 그대로이며 낭독 숨김이 풀리고 onReply는 없다", () => {
  const { onReply } = mount();
  advance(3200);

  fireEvent.tap(screen.getByTestId("ui-lynx-overlay"), {});

  expect(sheet()).toBeNull();
  expect(screen.getByTestId("result-screen")).toBeTruthy();
  expect(resultHidden()).toBe(false);
  expect(onReply).not.toHaveBeenCalled();
});

test("MC2-UI15. Later 탭도 시트만 닫고 걸린 타이머가 남지 않는다", () => {
  mount();
  advance(2000);

  tap(ids.later);

  expect(sheet()).toBeNull();
  expect(screen.getByTestId("result-screen")).toBeTruthy();
  advance(16);
  expect(timers.pending()).toBe(0);
  advance(5000);
  expect(sheet()).toBeNull();
  expect(keyHaptic).not.toHaveBeenCalled();
});

test("MC2-UI15. 시스템 뒤로: 시트가 보이는 동안만 처리해 시트를 닫는다", () => {
  mount();
  expect(systemBack()).toBe(false);
  advance(2000);

  expect(systemBack()).toBe(true);

  expect(sheet()).toBeNull();
  expect(screen.getByTestId("result-screen")).toBeTruthy();
  expect(resultHidden()).toBe(false);
  expect(systemBack()).toBe(false);
});

test("MC2-UI15. Reply 탭 → 시트가 먼저 닫히고 onReply 한 번 — 맵 층이 숨은 탭에 남아도 돌아왔을 때 시트가 없다", () => {
  const { onReply } = mount();
  advance(3200);

  tap(ids.reply);

  expect(onReply).toHaveBeenCalledTimes(1);
  expect(sheet()).toBeNull();
  expect(resultHidden()).toBe(false);
  advance(5000);
  expect(sheet()).toBeNull();
  expect(systemBack()).toBe(false);
});

// ------------------------------------------------------------------ 맵 위 층: 보임 알림 · 숨은 탭

function mountOnMap(active: boolean) {
  const onVisibleChange = vi.fn<(visible: boolean) => void>();
  const onReply = vi.fn<() => void>();
  const layerOf = (isActive: boolean) => (
    <NewFriendLayer
      model={MODEL}
      onReply={onReply}
      timers={timers}
      active={isActive}
      onVisibleChange={onVisibleChange}
    >
      <view data-testid="result-screen" />
    </NewFriendLayer>
  );
  const view = render(layerOf(active));
  return {
    onVisibleChange,
    onReply,
    view,
    setActive: (next: boolean) => view.rerender(layerOf(next)),
  };
}

test("NF-M1. onVisibleChange: 마운트에는 알리지 않고, 시트가 서면 true, Later로 닫히면 false를 한 번씩 알린다", () => {
  const { onVisibleChange } = mountOnMap(true);
  expect(onVisibleChange).not.toHaveBeenCalled();

  advance(2000);
  expect(onVisibleChange.mock.calls).toEqual([[true]]);
  advance(1200);
  expect(onVisibleChange).toHaveBeenCalledTimes(1);

  tap(ids.later);
  expect(onVisibleChange.mock.calls).toEqual([[true], [false]]);
});

test("NF-M1. onVisibleChange: Reply로 닫혀도 false를 알린다", () => {
  const { onVisibleChange, onReply } = mountOnMap(true);
  advance(3200);

  tap(ids.reply);

  expect(onReply).toHaveBeenCalledTimes(1);
  expect(onVisibleChange.mock.calls).toEqual([[true], [false]]);
});

test("NF-M1. onVisibleChange: 시트가 선 채 언마운트하면 false를, 서기 전 언마운트면 아무것도 알리지 않는다", () => {
  const first = mountOnMap(true);
  advance(2000);
  first.view.unmount();
  expect(first.onVisibleChange.mock.calls).toEqual([[true], [false]]);

  const second = mountOnMap(true);
  advance(500);
  second.view.unmount();
  expect(second.onVisibleChange).not.toHaveBeenCalled();
});

test("NF-M1. resultFocusId가 없으면 닫혀도 초점을 옮기지 않는다", () => {
  mountOnMap(true);
  advance(3200);
  focusCalls().mockClear();

  tap(ids.later);
  advance(16);

  expect(focusCalls()).not.toHaveBeenCalled();
});

test("NF-M2. 숨은 탭(active 거짓)에서는 기다림이 멈춰 시트가 서지 않고, 돌아오면 그때부터 2000 ms 뒤 선다", () => {
  const { setActive, onVisibleChange } = mountOnMap(true);
  advance(1500);
  setActive(false);

  advance(10_000);
  expect(sheet()).toBeNull();
  expect(onVisibleChange).not.toHaveBeenCalled();

  setActive(true);
  advance(1999);
  expect(sheet()).toBeNull();
  advance(1);
  expect(sheet()?.getAttribute("data-phase")).toBe("typing");
});

test("NF-M2. 시트가 선 뒤 탭이 숨으면 시트를 그리지 않고 false를 알리며 뒤로가기도 받지 않는다 — 돌아오면 다시 보인다", () => {
  const { setActive, onVisibleChange } = mountOnMap(true);
  advance(2000);
  advance(1200);

  setActive(false);
  expect(sheet()).toBeNull();
  expect(resultHidden()).toBe(false);
  expect(systemBack()).toBe(false);
  expect(onVisibleChange.mock.calls).toEqual([[true], [false]]);

  setActive(true);
  expect(sheet()?.getAttribute("data-phase")).toBe("message");
  expect(onVisibleChange.mock.calls).toEqual([[true], [false], [true]]);
});

test("MC2-UI15. 언마운트하면 걸린 타이머가 하나도 남지 않고 시트도 나오지 않는다", () => {
  const { view } = mount();
  advance(500);
  expect(timers.pending()).toBeGreaterThan(0);

  view.unmount();

  expect(timers.pending()).toBe(0);
  advance(5000);
  expect(keyHaptic).not.toHaveBeenCalled();
});

test("MC2-UI15. typing 중에 언마운트해도 타이머가 남지 않는다", () => {
  const { view } = mount();
  advance(2000);

  view.unmount();

  expect(timers.pending()).toBe(0);
});

// ------------------------------------------------------------------ 접근성 M5 초점

test("M5. typing이 서면 다음 프레임(16 ms)에 시트 머리로 초점을 보내고, 그 뒤에 typing을 낭독한다(초점 → 낭독 순서)", () => {
  mount();
  advance(2000);
  expect(focusCalls()).not.toHaveBeenCalled();
  expect(announce()).not.toHaveBeenCalled();

  advance(16);

  expect(focusCalls()).toHaveBeenCalledTimes(1);
  expect(focusCalls()).toHaveBeenCalledWith(ids.title);
  expect(announce()).toHaveBeenCalledTimes(1);
  expect(focusCalls().mock.invocationCallOrder[0]).toBeLessThan(
    announce().mock.invocationCallOrder[0] ?? 0,
  );
});

test("M5. Later로 닫으면 다음 프레임에 결과 화면 요소로 초점을 돌리고 타이머가 남지 않는다", () => {
  mount();
  advance(3200);
  focusCalls().mockClear();

  tap(ids.later);
  expect(focusCalls()).not.toHaveBeenCalled();
  advance(16);

  expect(focusCalls()).toHaveBeenCalledTimes(1);
  expect(focusCalls()).toHaveBeenCalledWith("result-title");
  expect(timers.pending()).toBe(0);
});

test("M5. scrim 탭 · 시스템 뒤로로 닫아도 초점이 결과 화면으로 돌아온다", () => {
  mount();
  advance(3200);
  focusCalls().mockClear();
  fireEvent.tap(screen.getByTestId("ui-lynx-overlay"), {});
  advance(16);
  expect(focusCalls()).toHaveBeenCalledWith("result-title");

  cleanup();
  focusCalls().mockClear();
  mount();
  advance(3200);
  systemBack();
  advance(16);
  expect(focusCalls()).toHaveBeenCalledWith("result-title");
});

test("M5. 닫기 전에 언마운트하면 초점 타이머가 남지 않는다", () => {
  const { view } = mount();
  advance(2000);

  view.unmount();

  expect(timers.pending()).toBe(0);
});
