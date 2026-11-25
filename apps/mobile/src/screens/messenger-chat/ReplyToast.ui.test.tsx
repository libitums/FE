import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import * as accessibility from "../../lib/accessibility";
import { replyToastTestIds as ids, REPLY_TOAST_MS } from "../../app/reply-toast.contract";
import { ReplyToast, type ReplyToastView } from "./ReplyToast";

// `ui` 계층(RT-UI1 ~ UI6): 답장 도착 토스트 카드(ADR-0200 · 시안 1 ~ 4).

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

const mount = (value: ReplyToastView | null, over: { reducedMotion?: boolean } = {}) => {
  const onOpen = vi.fn<() => void>();
  const onDismiss = vi.fn<() => void>();
  const result = render(
    <ReplyToast
      view={value}
      top={47}
      reducedMotion={over.reducedMotion ?? false}
      onOpen={onOpen}
      onDismiss={onDismiss}
    />,
  );
  return { onOpen, onDismiss, ...result };
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
  expect(screen.getByTestId(ids.card).getAttribute("style")).toContain("top: 55px");
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
  expect(onDismiss).toHaveBeenCalledTimes(1);
  expect(onOpen).not.toHaveBeenCalled();
  expect(screen.getByTestId(ids.close).getAttribute("accessibility-label")).toBe("Dismiss");
  fireEvent.tap(screen.getByTestId(ids.open));
  expect(onOpen).toHaveBeenCalledTimes(1);
});

test("RT-UI4. 4초 뒤 올라가며 onDismiss 한 번, 새 key가 오면 처음부터 다시 센다", () => {
  vi.useFakeTimers();
  const { onDismiss, rerender } = mount(view());
  act(() => {
    vi.advanceTimersByTime(REPLY_TOAST_MS - 1000);
  });
  rerender(
    <ReplyToast
      view={view({ key: 2, preview: "또 왔어" })}
      top={47}
      reducedMotion={false}
      onOpen={() => {}}
      onDismiss={onDismiss}
    />,
  );
  act(() => {
    vi.advanceTimersByTime(REPLY_TOAST_MS - 1);
  });
  expect(onDismiss).not.toHaveBeenCalled();
  act(() => {
    vi.advanceTimersByTime(1000);
  });
  expect(onDismiss).toHaveBeenCalledTimes(1);
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
  expect(onDismiss).toHaveBeenCalledTimes(1);
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
