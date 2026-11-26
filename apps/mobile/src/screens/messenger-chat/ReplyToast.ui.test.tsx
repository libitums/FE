import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import * as accessibility from "../../lib/accessibility";
import { replyToastTestIds as ids, REPLY_TOAST_MS } from "../../app/reply-toast.contract";
import { ReplyToast, type ReplyToastView } from "./ReplyToast";

// `ui` 계층(RT-UI1 ~ UI8): 답장 도착 토스트 카드(ADR-0200 · 시안 1 ~ 4) — 개정 1: 인물별 카드를 쌓고 카드마다 따로 닫힘.

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const view = (over: Partial<ReplyToastView> = {}): ReplyToastView => ({
  key: 1,
  name: "미나",
  avatarUrl: null,
  preview: "와, 사진 진짜 예쁘다!",
  more: 0,
  ...over,
});

type Handlers = {
  readonly onOpen: (key: number) => void;
  readonly onDismiss: (key: number) => void;
};
const toast = (views: readonly ReplyToastView[], h: Handlers, reducedMotion = false) => (
  <ReplyToast
    views={views}
    top={47}
    reducedMotion={reducedMotion}
    onOpen={h.onOpen}
    onDismiss={h.onDismiss}
  />
);
const mount = (value: ReplyToastView | null, over: { reducedMotion?: boolean } = {}) =>
  mountAll(value === null ? [] : [value], over);
const mountAll = (views: readonly ReplyToastView[], over: { reducedMotion?: boolean } = {}) => {
  const onOpen = vi.fn<(key: number) => void>();
  const onDismiss = vi.fn<(key: number) => void>();
  const result = render(toast(views, { onOpen, onDismiss }, over.reducedMotion ?? false));
  const update = (next: readonly ReplyToastView[]) =>
    result.rerender(toast(next, { onOpen, onDismiss }));
  return { onOpen, onDismiss, update, ...result };
};

test("RT-UI1. 이름 · 미리보기 한 줄을 보이고, 카드 하나로 낭독하며 뜰 때 한 번 알린다", () => {
  const spoken = vi.spyOn(accessibility, "announce");
  mount(view());
  const card = screen.getByTestId(ids.open);
  expect(card).toHaveTextContent("미나");
  expect(screen.getByTestId(ids.preview)).toHaveTextContent("와, 사진 진짜 예쁘다!");
  expect(card.getAttribute("accessibility-label")).toBe(
    "New message from 미나: 와, 사진 진짜 예쁘다!",
  );
  expect(spoken).toHaveBeenCalledTimes(1);
  expect(spoken).toHaveBeenCalledWith("New message from 미나: 와, 사진 진짜 예쁘다!");
  expect(screen.queryByTestId(ids.more)).toBeNull();
  expect(screen.getByTestId(ids.stack).getAttribute("style")).toContain("top: 55px");
});

test("RT-UI2. 다른 인물이 겹치면 「+N」을 보이고 낭독에도 싣는다", () => {
  mount(view({ name: "한도윤", preview: "Sent a photo", more: 2 }));
  expect(screen.getByTestId(ids.more)).toHaveTextContent("+2");
  expect(screen.getByTestId(ids.open).getAttribute("accessibility-label")).toBe(
    "New message from 한도윤: Sent a photo. 2 more",
  );
});

test("RT-UI3. 누르면 onOpen, 닫기 단추는 onDismiss만(44pt 단추 · 낭독 「Dismiss」)", () => {
  const { onOpen, onDismiss } = mount(view());
  fireEvent.tap(screen.getByTestId(ids.close));
  expect(onDismiss).toHaveBeenCalledWith(1);
  expect(onOpen).not.toHaveBeenCalled();
  expect(screen.getByTestId(ids.close).getAttribute("accessibility-label")).toBe("Dismiss");
  // Android 낭독 나무에 남게 — 낭독 요소는 납작하게 펴지 않습니다.
  expect(screen.getByTestId(ids.close).getAttribute("flatten")).toBe("false");
  expect(screen.getByTestId(ids.open).getAttribute("flatten")).toBe("false");
  fireEvent.tap(screen.getByTestId(ids.open));
  expect(onOpen).toHaveBeenCalledWith(1);
});

test("RT-UI4. 4초 뒤 올라가며 그 카드의 onDismiss 한 번, 새 key(갈아 끼움)가 오면 처음부터 다시 센다", () => {
  vi.useFakeTimers();
  const { onDismiss, update } = mount(view());
  act(() => {
    vi.advanceTimersByTime(REPLY_TOAST_MS - 1000);
  });
  update([view({ key: 2, preview: "또 왔어" })]);
  act(() => {
    vi.advanceTimersByTime(REPLY_TOAST_MS - 1);
  });
  expect(onDismiss).not.toHaveBeenCalled();
  act(() => {
    vi.advanceTimersByTime(1000);
  });
  expect(onDismiss).toHaveBeenCalledTimes(1);
  expect(onDismiss).toHaveBeenCalledWith(2);
});

test("RT-UI4b. 카드가 밖에서 걷히면 남은 4초 타이머도 풀려 onDismiss를 부르지 않는다(리뷰 지적)", () => {
  vi.useFakeTimers();
  const { onDismiss, update } = mount(view());
  update([]);
  act(() => {
    vi.advanceTimersByTime(REPLY_TOAST_MS + 1000);
  });
  expect(onDismiss).not.toHaveBeenCalled();
});

test("RT-UI5. 위로 밀면 닫히고, 조금만 밀거나 아래로 밀면 닫히지 않는다", () => {
  vi.useFakeTimers();
  const { onDismiss } = mount(view());
  const card = screen.getByTestId(ids.card);
  fireEvent.touchstart(card, { detail: { y: 100 } });
  fireEvent.touchend(card, { detail: { y: 90 } });
  fireEvent.touchstart(card, { detail: { y: 100 } });
  fireEvent.touchend(card, { detail: { y: 160 } });
  act(() => {
    vi.advanceTimersByTime(500);
  });
  expect(onDismiss).not.toHaveBeenCalled();
  fireEvent.touchstart(card, { detail: { y: 100 } });
  fireEvent.touchend(card, { detail: { y: 60 } });
  act(() => {
    vi.advanceTimersByTime(500);
  });
  expect(onDismiss).toHaveBeenCalledWith(1);
});

test("RT-UI6. 움직임 줄이기면 미끄러짐 대신 페이드, 카드가 없으면 아무것도 그리지 않는다", () => {
  mount(view(), { reducedMotion: true });
  expect(screen.getByTestId(ids.card).getAttribute("class")).toContain("reply-toast-fade");
  cleanup();
  mount(view());
  expect(screen.getByTestId(ids.card).getAttribute("class")).toContain("reply-toast-slide");
  cleanup();
  mount(null);
  expect(screen.queryByTestId(ids.card)).toBeNull();
});

test("RT-UI7. 여러 장은 위에서 아래로 쌓이고(넘겨준 순서 = 맨 위가 처음), 「+N」은 맨 아래 카드에만, 새 카드만 낭독한다", () => {
  const spoken = vi.spyOn(accessibility, "announce");
  const { update } = mountAll([view({ key: 1, name: "미나" })]);
  update([
    view({ key: 2, name: "한도윤", preview: "Sent a photo" }),
    view({ key: 1, name: "미나", more: 2 }),
  ]);
  const cards = screen.getAllByTestId(ids.open);
  expect(cards.map((card) => card.textContent)).toEqual([
    expect.stringContaining("한도윤"),
    expect.stringContaining("미나"),
  ]);
  expect(screen.getAllByTestId(ids.more)).toHaveLength(1);
  expect(screen.getByTestId(ids.more)).toHaveTextContent("+2");
  expect(spoken.mock.calls.map((call) => call[0])).toEqual([
    "New message from 미나: 와, 사진 진짜 예쁘다!",
    "New message from 한도윤: Sent a photo",
  ]);
});

test("RT-UI8. 카드마다 타이머 · 밀기가 따로 — 먼저 선 카드가 먼저 닫히고, 위로 민 카드만 닫힌다", () => {
  vi.useFakeTimers();
  const { onDismiss, onOpen, update } = mountAll([view({ key: 1 })]);
  act(() => {
    vi.advanceTimersByTime(2000);
  });
  update([view({ key: 2, name: "한도윤" }), view({ key: 1 })]);
  act(() => {
    vi.advanceTimersByTime(REPLY_TOAST_MS - 2000);
  });
  expect(onDismiss.mock.calls).toEqual([[1]]);
  const top = screen.getAllByTestId(ids.card)[0];
  if (top === undefined) throw new Error("카드 없음");
  fireEvent.touchstart(top, { detail: { y: 100 } });
  fireEvent.touchend(top, { detail: { y: 60 } });
  act(() => {
    vi.advanceTimersByTime(500);
  });
  expect(onDismiss.mock.calls).toEqual([[1], [2]]);
  fireEvent.tap(screen.getAllByTestId(ids.open)[1] ?? top);
  expect(onOpen).toHaveBeenCalledWith(1);
});
