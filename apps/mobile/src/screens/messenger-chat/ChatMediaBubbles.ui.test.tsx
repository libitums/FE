import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { MotionProvider } from "@libitums/ui-lynx/motion";

import {
  PhotoBubble,
  PhotoPendingBubble,
  VoiceBubble,
  VoicePendingBubble,
} from "./ChatMediaBubbles";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import { advance, clearBackHandlers, imageUrlOf, mountChat } from "./chat-ui.test-support";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import { realChildren } from "../../lib/dom.test-support";

// `ui` 계층(MC-UI21): 매체 말풍선 넷(명시 변형) — pending은 한 요소 한 줄 낭독 · 사진은 3:4 · src null이면 빈 면 ·
// 음성 도착은 재생 버튼(data-playback) · 길이 · ko · en · 움직임 줄이기에서 반짝임 멈춤.
// pending → 도착이 같은 줄 자리에서 바뀌는지는 화면 결선(아래)으로 본다.

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 9, 12, 0, 0));
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

/** test-id 요소 · 그 안쪽 · 그 조상 중 접근성 이름을 가진 가장 가까운 것의 이름입니다. */
function spokenNear(testId: string): string {
  const el = screen.getByTestId(testId);
  for (let node: Element | null = el; node !== null; node = node.parentElement) {
    const label = node.getAttribute("accessibility-label");
    if (label !== null) return label;
  }
  return el.querySelector("[accessibility-label]")?.getAttribute("accessibility-label") ?? "";
}

test("MC-UI21. 사진 pending: 한 요소가 「… is sending a picture…」 한 줄로 읽힌다", () => {
  render(<PhotoPendingBubble name="미나" testId="pp" />);

  const el = screen.getByTestId("pp");
  expect(el.getAttribute("accessibility-element")).toBe("true");
  expect(el.getAttribute("accessibility-label")).toBe("미나 is sending a picture…");
  expect(el.textContent).toContain("미나 is sending a picture…");
});

test("MC-UI21. 음성 pending: 한 줄 낭독과 파형(막대 20)이 서고 도착 말풍선의 글 줄은 없다", () => {
  render(<VoicePendingBubble name="미나" testId="vp" />);

  const el = screen.getByTestId("vp");
  expect(el.getAttribute("accessibility-element")).toBe("true");
  expect(el.getAttribute("accessibility-label")).toBe("미나 is recording a voice message…");
  expect(el.textContent).toContain("미나 is recording a voice message…");
  expect(el.querySelectorAll(`[class*="wave"]`).length).toBeGreaterThanOrEqual(
    CHAT_PLACEHOLDERS.waveform.length,
  );
});

test("MC-UI21. 움직임 줄이기면 pending 둘의 반짝임이 messenger-chat-skeleton-still로 멈춘다", () => {
  const { container, rerender } = render(
    <>
      <PhotoPendingBubble name="미나" testId="pp" />
      <VoicePendingBubble name="미나" testId="vp" />
    </>,
  );
  expect(container.querySelector(".messenger-chat-skeleton-still")).toBeNull();

  rerender(
    <MotionProvider motion="reduced">
      <PhotoPendingBubble name="미나" testId="pp" />
      <VoicePendingBubble name="미나" testId="vp" />
    </MotionProvider>,
  );

  expect(
    screen.getByTestId("pp").closest(".messenger-chat-skeleton-still") ??
      screen.getByTestId("pp").querySelector(".messenger-chat-skeleton-still"),
  ).not.toBeNull();
  expect(
    screen.getByTestId("vp").closest(".messenger-chat-skeleton-still") ??
      screen.getByTestId("vp").querySelector(".messenger-chat-skeleton-still"),
  ).not.toBeNull();
});

test("MC-UI21. 사진 도착: 3:4 사진이 src를 싣고 「Photo from …」로 읽힌다", () => {
  render(<PhotoBubble src="https://cdn/a.webp" name="미나" testId="ph" />);

  const el = screen.getByTestId("ph");
  expect(el.className).toContain("chat-photo-3x4");
  expect(el.getAttribute("src")).toBe("https://cdn/a.webp");
  expect(spokenNear("ph")).toBe("Photo from 미나");
});

test("MC-UI21. src가 null이면 같은 크기의 빈 면이다(그림 없음 · 낭독은 그대로)", () => {
  render(<PhotoBubble src={null} name="미나" testId="ph" />);

  const el = screen.getByTestId("ph");
  expect(el.getAttribute("src")).toBeNull();
  expect(el.querySelector("image[src]")).toBeNull();
  expect(spokenNear("ph")).toBe("Photo from 미나");
});

function mountVoice() {
  render(
    <VoiceBubble
      durationMs={4000}
      text={{ ko: "안녕하세요", en: "Hello" }}
      name="미나"
      testId="vb"
    />,
  );
}

test("MC-UI21. 음성 도착: 길이 0:04 · 한국어 한 줄 · 영어 한 줄을 보이고 말풍선 낭독이 한 문장이다", () => {
  mountVoice();

  const el = screen.getByTestId("vb");
  expect(el.textContent).toContain("0:04");
  expect(el.textContent).toContain("안녕하세요");
  expect(el.textContent).toContain("Hello");
  expect(spokenNear("vb")).toBe("미나: voice message 0:04, 안녕하세요, Hello");
});

test("MC-UI21. 재생 버튼: idle → 누르면 playing(Pause) → durationMs 뒤 idle(Play)", () => {
  mountVoice();
  const play = () => screen.getByTestId(ids.voicePlay);
  const label = () =>
    (play().hasAttribute("accessibility-label")
      ? play()
      : play().querySelector("[accessibility-label]")
    )?.getAttribute("accessibility-label");
  expect(play().getAttribute("data-playback")).toBe("idle");
  expect(label()).toBe("Play");

  fireEvent.tap(play(), { eventType: "catchEvent" });
  expect(play().getAttribute("data-playback")).toBe("playing");
  expect(label()).toBe("Pause");

  act(() => {
    vi.advanceTimersByTime(3999);
  });
  expect(play().getAttribute("data-playback")).toBe("playing");
  act(() => {
    vi.advanceTimersByTime(1);
  });
  expect(play().getAttribute("data-playback")).toBe("idle");
  expect(label()).toBe("Play");
});

// ----------------------------------------------------------------------- 화면: 같은 자리에서 바뀜

/** 로그 안쪽 상자의 직계 자식 중 이 요소를 품은 줄의 위치입니다. */
function rowIndexOf(testId: string): number {
  const inner = screen.getByTestId(ids.log).querySelector(".chat-log-inner");
  const target = screen.getByTestId(testId);
  const rows = realChildren(inner);
  return rows.findIndex((row) => row === target || row.contains(target));
}

test("MC-UI21. 화면: 사진 pending이 도착하면 같은 줄 자리에서 사진으로 바뀌고 줄 수가 같다", () => {
  const { source } = mountChat();
  act(() => {
    source.requestMedia("mina", "photo");
  });
  const pendingIndex = rowIndexOf(ids.photoPending);
  const rowCount = realChildren(
    screen.getByTestId(ids.log).querySelector(".chat-log-inner"),
  ).length;
  expect(pendingIndex).toBeGreaterThanOrEqual(0);

  advance(CHAT_PLACEHOLDERS.timing.photoArrivalMs);

  expect(screen.queryByTestId(ids.photoPending)).toBeNull();
  expect(rowIndexOf(ids.photo)).toBe(pendingIndex);
  expect(realChildren(screen.getByTestId(ids.log).querySelector(".chat-log-inner"))).toHaveLength(
    rowCount,
  );
  expect(screen.getByTestId(ids.photo).getAttribute("src")).toBe(
    imageUrlOf("content/images/photo-a.webp"),
  );
});

test("MC-UI21. 화면: 음성 pending도 도착하면 같은 줄 자리에서 음성이 되고 ko · en 줄을 보인다", () => {
  const { source } = mountChat();
  act(() => {
    source.requestMedia("mina", "voice");
  });
  const pendingIndex = rowIndexOf(ids.voicePending);

  advance(CHAT_PLACEHOLDERS.timing.voiceArrivalMs);

  expect(screen.queryByTestId(ids.voicePending)).toBeNull();
  expect(rowIndexOf(ids.voice)).toBe(pendingIndex);
  expect(screen.getByTestId(ids.voice).textContent).toContain("0:04");
  expect(screen.getByTestId(ids.voice).textContent).toContain("안녕하세요");
  expect(screen.getByTestId(ids.voice).textContent).toContain("Hello");
});

test("MC-UI21. 화면: 사진과 음성을 함께 요청해도 각자 자기 자리에서 따로 도착한다", () => {
  const { source } = mountChat();
  act(() => {
    source.requestMedia("mina", "photo");
    source.requestMedia("mina", "voice");
  });
  expect(screen.getByTestId(ids.photoPending)).toBeTruthy();
  expect(screen.getByTestId(ids.voicePending)).toBeTruthy();

  advance(CHAT_PLACEHOLDERS.timing.voiceArrivalMs);
  expect(screen.getByTestId(ids.voice)).toBeTruthy();
  expect(screen.getByTestId(ids.photoPending)).toBeTruthy();

  advance(CHAT_PLACEHOLDERS.timing.photoArrivalMs);
  expect(screen.getByTestId(ids.photo)).toBeTruthy();
});
