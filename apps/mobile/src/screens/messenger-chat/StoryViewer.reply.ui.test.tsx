import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import {
  advance,
  clearBackHandlers,
  fireOnRef,
  nativeInput,
  systemBack,
  tapId,
} from "./chat-ui.test-support";
import {
  friendStoriesTestIds as ids,
  type StoryReplyOutcome,
  type StoryViewerItem,
  type StoryViewerProps,
} from "./friend-stories.contract";
import { STORY_NOW, story } from "./friend-stories.test-support";
import { StoryViewer } from "./StoryViewer";

// `ui` 계층(FS-UI19 ~ UI24): 보기에서 바로 답장(ADR-0178 D5 개정) — 진짜 입력 칸 · 키보드 위 · 입력 중 멈춤 · 보내기(칩 · 칸) ·
// 「Sent · Open chat」 · 실패 안내 · 뒤로 = 키보드 먼저.

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(STORY_NOW);
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const item = (id: string, name: string, patch = {}): StoryViewerItem => ({
  story: story(id, patch),
  name,
  avatarUrl: null,
  imageUrl: null,
  unmet: null,
});

type Deferred = { resolve: (outcome: StoryReplyOutcome) => void };

function mount(over: Partial<StoryViewerProps> = {}) {
  const pending: Deferred[] = [];
  const onReply = vi.fn(
    () =>
      new Promise<StoryReplyOutcome>((resolve) => {
        pending.push({ resolve });
      }),
  );
  const props: StoryViewerProps = {
    items: [item("a", "윤경"), item("b", "해준", { freeReply: false })],
    start: 0,
    now: STORY_NOW,
    reducedMotion: false,
    romanization: true,
    keyboardHeight: 300,
    onShown: vi.fn(),
    onReply,
    onOpenChat: vi.fn(),
    onKeyboardHeight: vi.fn(),
    onSaveWord: vi.fn(),
    onMeet: vi.fn(),
    onProfile: vi.fn(),
    onClose: vi.fn(),
    ...over,
  };
  render(<StoryViewer {...props} />);
  const settle = async (outcome: StoryReplyOutcome) => {
    await act(async () => {
      pending.shift()?.resolve(outcome);
      await Promise.resolve();
      await Promise.resolve();
    });
  };
  return { props, settle };
}

const input = () => screen.getByTestId(ids.replyInput);
const name = () => screen.getByTestId(ids.name).textContent;
const type = (value: string) =>
  act(() => {
    nativeInput("input", value, ids.replyInput);
  });
const focus = () =>
  act(() => {
    nativeInput("focus", "", ids.replyInput);
  });
const blur = () =>
  act(() => {
    nativeInput("blur", "", ids.replyInput);
  });

test("FS-UI19. 답장 칸은 진짜 입력 칸 — 자리표시 「Reply to <이름>…」 · 보내기 단추는 빈 글이면 꺼짐", () => {
  mount();
  expect(input().tagName.toLowerCase()).toBe("input");
  expect(input().getAttribute("placeholder")).toBe("Reply to 윤경…");
  expect(input().getAttribute("confirm-type")).toBe("send");
  expect(screen.getByTestId(ids.replySend).getAttribute("accessibility-traits")).toBe("disabled");
  type("  ");
  expect(screen.getByTestId(ids.replySend).getAttribute("accessibility-traits")).toBe("disabled");
  type("안녕");
  expect(screen.getByTestId(ids.replySend).getAttribute("accessibility-traits")).toBe("button");
  expect(screen.getByTestId(ids.replySend).getAttribute("accessibility-label")).toBe("Send");
});

test("FS-UI20. 입력 칸에 초점이 오면 멈추고(진행 막대 정지) 키보드 높이 위로 오르며, 내려가면 이어 간다", () => {
  mount();
  const bottom = () => screen.getByTestId(ids.replyBottom).getAttribute("style") ?? "";
  focus();
  advance(20_000);
  expect(name()).toBe("윤경");
  expect(screen.getByTestId(ids.segment(0)).querySelector(".story-progress-paused")).not.toBeNull();
  // 키보드 높이(300) + 틈(8) — 대화방 입력 줄처럼 키보드 바로 위.
  expect(bottom()).toContain("padding-bottom: 308px");
  fireOnRef(ids.replyInput, "keyboardheightchange", { height: 320 });
  blur();
  expect(bottom()).not.toContain("308px");
  advance(6_000);
  expect(name()).toBe("해준");
});

test("FS-UI20. 입력 칸이 잰 키보드 높이를 올려 보낸다", () => {
  const { props } = mount();
  fireOnRef(ids.replyInput, "keyboardheightchange", { height: 320 });
  expect(props.onKeyboardHeight).toHaveBeenCalledWith(320);
});

test("FS-UI21. 보내기(단추) — 보기를 떠나지 않고 onReply(그 글, typed), 보내는 중엔 단추 꺼짐, 보내면 칸을 비우고 Sent · Open chat", async () => {
  const { props, settle } = mount();
  focus();
  type("나도 먹고 싶다");
  tapId(ids.replySend);
  expect(props.onReply).toHaveBeenCalledWith(props.items[0], "나도 먹고 싶다", "typed");
  expect(screen.getByTestId(ids.replySend).getAttribute("accessibility-traits")).toBe("disabled");
  await settle({ kind: "sent" });
  expect(props.onClose).not.toHaveBeenCalled();
  expect(input().getAttribute("default-value") ?? "").toBe("");
  expect(screen.getByTestId(ids.sent).textContent).toContain("Sent");
  tapId(ids.openChat);
  expect(props.onOpenChat).toHaveBeenCalledWith(props.items[0]);
});

test("FS-UI21. 키보드 return(confirm)으로도 보낸다, 빈 글은 보내지 않는다", () => {
  const { props } = mount();
  act(() => {
    nativeInput("confirm", "", ids.replyInput);
  });
  expect(props.onReply).not.toHaveBeenCalled();
  type("좋아");
  act(() => {
    nativeInput("confirm", "좋아", ids.replyInput);
  });
  expect(props.onReply).toHaveBeenCalledWith(props.items[0], "좋아", "typed");
});

// 사용자 결정(2026-11-26, D5 개정): 보낸 뒤 「Sent」 알림 동안은 멈추지 않는다 — 전에는 알림 3초 동안 멈췄다가(9초에 다음 인물) 이어 갔다.
test("FS-UI21. 보낸 뒤엔 멈추지 않는다 — Sent 알림이 떠 있어도 진행은 이어 가고 알림은 3초 뒤 사라진다 · 첫 답장 무료 안내는 보낸 뒤 사라진다", async () => {
  const { settle } = mount();
  expect(screen.queryByTestId(ids.free)).not.toBeNull();
  tapId(ids.chip(0));
  await settle({ kind: "sent" });
  expect(screen.queryByTestId(ids.free)).toBeNull();
  advance(2_999);
  expect(name()).toBe("윤경");
  expect(screen.queryByTestId(ids.sent)).not.toBeNull();
  advance(1);
  expect(screen.queryByTestId(ids.sent)).toBeNull();
  advance(3_000);
  expect(name()).toBe("해준");
});

test("FS-UI21. 보내는 중(요청 진행 중)에는 멈춘다", () => {
  mount();
  tapId(ids.chip(0));
  advance(10_000);
  expect(name()).toBe("윤경");
});

test("FS-UI21. Sent 알림은 다음 장 · 다음 인물로 넘어가도 같은 자리에 남고(다시 그려지지 않음), Open chat은 보낸 인물의 방", async () => {
  const { props, settle } = mount({
    items: [item("a", "윤경"), item("a", "윤경", { id: "s-a2" }), item("b", "해준")],
  });
  tapId(ids.chip(0));
  await settle({ kind: "sent" });
  const toast = screen.getByTestId(ids.sent);
  advance(1_000);
  tapId(ids.next);
  expect(screen.getByTestId(ids.progress).getAttribute("accessibility-label")).toBe("Story 2 of 2");
  expect(screen.getByTestId(ids.sent)).toBe(toast);
  tapId(ids.next);
  expect(name()).toBe("해준");
  expect(screen.getByTestId(ids.sent)).toBe(toast);
  expect(screen.getByTestId(ids.sent).textContent).toContain("Sent");
  tapId(ids.openChat);
  expect(props.onOpenChat).toHaveBeenCalledWith(props.items[0]);
  advance(2_000);
  expect(screen.queryByTestId(ids.sent)).toBeNull();
});

test("FS-UI22. 칩 = 그 자리에서 보냄(onReply(그 말, chip)) — 방으로 가지 않는다", async () => {
  const { props, settle } = mount();
  tapId(ids.chip(1));
  expect(props.onReply).toHaveBeenCalledWith(props.items[0], "수고했어!", "chip");
  await settle({ kind: "sent" });
  expect(props.onClose).not.toHaveBeenCalled();
  expect(props.onOpenChat).not.toHaveBeenCalled();
});

test("FS-UI23. 실패면 글을 칸에 남기고 짧은 안내 — 엽전 부족은 coins 안내", async () => {
  const { settle } = mount();
  focus();
  type("다시 보내");
  tapId(ids.replySend);
  await settle({ kind: "failed", reason: "failed" });
  expect(screen.getByTestId(ids.replyError).textContent).toBe("Couldn't send. Try again.");
  expect(screen.queryByTestId(ids.sent)).toBeNull();
  expect(screen.getByTestId(ids.replySend).getAttribute("accessibility-traits")).toBe("button");
  tapId(ids.replySend);
  await settle({ kind: "failed", reason: "coins" });
  expect(screen.getByTestId(ids.replyError).textContent).toBe("Not enough coins");
  // 같은 글로 다시 온 input(Android가 조합을 마칠 때)은 안내를 걷지 않고, 글을 고치면 걷힌다.
  type("다시 보내");
  expect(screen.getByTestId(ids.replyError).textContent).toBe("Not enough coins");
  type("다시 보내!");
  expect(screen.queryByTestId(ids.replyError)).toBeNull();
});

test("FS-UI24. 입력 중 뒤로 = 키보드 먼저(보기는 닫히지 않음), 그 뒤 뒤로 = 닫기 · 입력 중 탭 자리 = 넘기지 않음", () => {
  const { props } = mount();
  focus();
  expect(systemBack()).toBe(true);
  expect(props.onClose).not.toHaveBeenCalled();
  focus();
  tapId(ids.next);
  expect(name()).toBe("윤경");
  focus();
  blur();
  expect(systemBack()).toBe(true);
  expect(props.onClose).toHaveBeenCalledTimes(1);
});

test("FS-UI24. 시트(엽전 상점 등)가 덮으면 키보드를 내린다 — 칸이 바닥으로", () => {
  const { props } = mount();
  focus();
  const bottom = () => screen.getByTestId(ids.replyBottom).getAttribute("style") ?? "";
  expect(bottom()).toContain("padding-bottom: 308px");
  cleanup();
  const view = render(<StoryViewer {...props} />);
  focus();
  view.rerender(<StoryViewer {...props} covered={true} />);
  expect(bottom()).not.toContain("308px");
});

test("FS-UI24. 답장 칸 접근성 — 입력은 자리표시 이름, 보내기는 버튼 · flatten false", () => {
  mount();
  expect(input().getAttribute("accessibility-label")).toBe("Reply to 윤경…");
  expect(screen.getByTestId(ids.replySend).getAttribute("flatten")).toBe("false");
});
