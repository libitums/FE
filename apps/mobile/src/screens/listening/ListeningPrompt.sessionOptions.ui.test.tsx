import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import play from "@libitums/icons/lynx/play";

import { ListeningPrompt } from "./ListeningPrompt";
import { initialSessionOptions } from "../../lib/session-options";
import type { SessionOptions } from "../../lib/session-options";

// `ui` 계층: 렌더 결과와 상호작용만 봅니다(ADR-0006 D4). `toHaveClass`·`toHaveStyle`·
// `toBeVisible`을 쓰지 않습니다(`docs/conventions/code.md`).
//
// ⚠ 파수꾼 공허 — 토글 기본값이 둘 다 켜짐이라 기본 fixture로는 옳은 배선과 틀린
// 배선(값을 안 읽고 오늘 동작 그대로)의 관찰이 같습니다. 그래서 LP1~LP6은 **끈
// fixture**로만 섭니다. LP7만 초기값(둘 다 켜짐) 앵커입니다.

const TEXT = "따뜻한 아메리카노 한 잔 주세요.";
const SOURCE = "ordering-1";

// 대역 형태는 `ListeningPrompt.ui.test.tsx`의 `stubHost()`와 같습니다 — 호스트 경계
// 하나만 대역하고 `lib/audio.ts`를 mock하지 않습니다.
const STOP = "<stop>";

type HostCall = { source: string; done: (result: unknown) => void };

function stubHost(): HostCall[] {
  const calls: HostCall[] = [];
  const mod = {
    play: (source: string, done: (result: unknown) => void) => void calls.push({ source, done }),
    stop: () => void calls.push({ source: STOP, done: () => {} }),
  };
  vi.stubGlobal("NativeModules", { AudioPlaybackModule: mod });
  return calls;
}

const sourcesOf = (calls: readonly HostCall[]): string[] => calls.map((call) => call.source);

const playSources = (calls: readonly HostCall[]): string[] =>
  calls.filter((call) => call.source !== STOP).map((call) => call.source);

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderPrompt(sessionOptions: SessionOptions) {
  return render(
    <ListeningPrompt text={TEXT} audioSource={SOURCE} sessionOptions={sessionOptions} />,
  );
}

const control = () => screen.getByTestId("listening-prompt-playback");
const icon = () => screen.getByTestId("listening-prompt-playback-icon");

const autoPlayOff: SessionOptions = { "auto-play-audio": false, "show-transcript": true };
const transcriptOff: SessionOptions = { "auto-play-audio": true, "show-transcript": false };
const bothOff: SessionOptions = { "auto-play-audio": false, "show-transcript": false };

test("[LP1] 자동 재생 꺼짐 — 마운트 시 play 0회 · 라벨 '듣기' · 아이콘 play", () => {
  const calls = stubHost();

  renderPrompt(autoPlayOff);

  expect(playSources(calls)).toEqual([]);
  expect(control()).toHaveTextContent("듣기");
  expect(control()).toHaveAttribute("accessibility-label", "듣기");
  expect(icon()).toHaveAttribute("content", play);
});

test("[LP2] 자동 재생 꺼짐 + 탭 → play가 audioSource로 1회 · 라벨 '멈춤'", () => {
  const calls = stubHost();
  renderPrompt(autoPlayOff);

  fireEvent.tap(control(), {});

  expect(playSources(calls)).toEqual([SOURCE]);
  expect(control()).toHaveTextContent("멈춤");
  expect(control()).toHaveAttribute("accessibility-label", "멈춤");
});

// LP3 — cleanup이 조건 없이 삽니다. 눌러서 튼 소리가 화면을 떠나도 계속 나면
// 안 됩니다.
test("[LP3] 자동 재생 꺼짐 + 탭 + 언마운트 → 호출 순서가 [SOURCE, STOP]이다", () => {
  const calls = stubHost();
  const { unmount } = renderPrompt(autoPlayOff);

  fireEvent.tap(control(), {});
  unmount();

  expect(sourcesOf(calls)).toEqual([SOURCE, STOP]);
});

test("[LP4] 대본 꺼짐 — listening-prompt-text가 문서에 없다", () => {
  stubHost();

  renderPrompt(transcriptOff);

  expect(screen.queryByTestId("listening-prompt-text")).not.toBeInTheDocument();
});

test("[LP5] 대본 꺼짐에서 재생 조작은 그대로 있고 testid 순서에 대본이 없다", () => {
  const { container } = renderPrompt(transcriptOff);

  expect(control()).toHaveAttribute("accessibility-element", "true");

  const order = [...container.querySelectorAll("[data-testid]")].map((el) =>
    el.getAttribute("data-testid"),
  );
  expect(order).not.toContain("listening-prompt-text");
});

test("[LP6] 둘 다 꺼짐 — play 0회이고 대본이 없다", () => {
  const calls = stubHost();

  renderPrompt(bothOff);

  expect(playSources(calls)).toEqual([]);
  expect(screen.queryByTestId("listening-prompt-text")).not.toBeInTheDocument();
});

// LP7 (가드·앵커) — 「켜면 지금 동작 그대로」가 여기 섭니다. 스텁에서도 통과하므로
// red로 세지 않습니다.
test("[LP7] 초기값(둘 다 켜짐) — play 1회 · 라벨 '멈춤' · 대본 있음", () => {
  const calls = stubHost();

  renderPrompt(initialSessionOptions);

  expect(playSources(calls)).toEqual([SOURCE]);
  expect(control()).toHaveTextContent("멈춤");
  expect(control()).toHaveAttribute("accessibility-label", "멈춤");
  expect(screen.getByTestId("listening-prompt-text")).toHaveTextContent(TEXT);
});
