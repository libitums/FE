import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import play from "@libitums/icons/lynx/play";

import { ListeningPrompt } from "./ListeningPrompt";
import { initialSessionOptions } from "../../lib/session-options";
import type { SessionOptions } from "../../lib/session-options";

// `ui` 계층: 렌더 결과와 상호작용만 본다(ADR-0006 D4). `toHaveClass` · `toHaveStyle` ·
// `toBeVisible`을 쓰지 않는다(`docs/conventions/code.md`).
//
// 계약: .agent-harness/work/lib-259/spec.md §0.3 D-a · D-b · §2.10 · §4.7.
// 계획: .agent-harness/work/lib-259/test-plan.md ui § `ListeningPrompt.sessionOptions.ui.test.tsx`
// LP1~LP7.
//
// ⚠ 파수꾼 공허 — 토글 기본값이 둘 다 켜짐이라 기본 fixture로는 옳은 배선과 틀린
// 배선(값을 안 읽고 오늘 동작 그대로)의 관찰이 같다(spec §0.3 D-a). 그래서 LP1~LP6은
// **끈 fixture**로만 선다. LP7만 초기값(둘 다 켜짐) 앵커다.

const TEXT = "따뜻한 아메리카노 한 잔 주세요.";
const SOURCE = "ordering-1";

// 대역 형태는 `ListeningPrompt.ui.test.tsx`의 `stubHost()`와 같다 — 호스트 경계
// 하나만 대역하고 `lib/audio.ts`를 mock하지 않는다.
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

// LP1: 자동 재생 꺼짐 — 마운트 시 play가 0회, 컨트롤 라벨이 '듣기', 아이콘이 play 모듈이다.
test("[LP1] 자동 재생 꺼짐 — 마운트 시 play 0회 · 라벨 '듣기' · 아이콘 play", () => {
  const calls = stubHost();

  renderPrompt(autoPlayOff);

  expect(playSources(calls)).toEqual([]);
  expect(control()).toHaveTextContent("듣기");
  expect(control()).toHaveAttribute("accessibility-label", "듣기");
  expect(icon()).toHaveAttribute("content", play);
});

// LP2: 이어서 컨트롤을 tap → play가 그 audioSource로 1회, 라벨 '멈춤'.
test("[LP2] 자동 재생 꺼짐 + 탭 → play가 audioSource로 1회 · 라벨 '멈춤'", () => {
  const calls = stubHost();
  renderPrompt(autoPlayOff);

  fireEvent.tap(control(), {});

  expect(playSources(calls)).toEqual([SOURCE]);
  expect(control()).toHaveTextContent("멈춤");
  expect(control()).toHaveAttribute("accessibility-label", "멈춤");
});

// LP3: 자동 재생 꺼짐 + tap + 언마운트 → 호출 순서가 [SOURCE, STOP]. cleanup이
// 조건 없이 산다(spec §0.3 D-b) — 눌러서 튼 소리가 화면을 떠나도 계속 나면 안 된다.
test("[LP3] 자동 재생 꺼짐 + 탭 + 언마운트 → 호출 순서가 [SOURCE, STOP]이다", () => {
  const calls = stubHost();
  const { unmount } = renderPrompt(autoPlayOff);

  fireEvent.tap(control(), {});
  unmount();

  expect(sourcesOf(calls)).toEqual([SOURCE, STOP]);
});

// LP4: 대본 꺼짐 — listening-prompt-text가 문서에 없다.
test("[LP4] 대본 꺼짐 — listening-prompt-text가 문서에 없다", () => {
  stubHost();

  renderPrompt(transcriptOff);

  expect(screen.queryByTestId("listening-prompt-text")).not.toBeInTheDocument();
});

// LP5: 같은 값에서 재생 조작은 그대로 있다 — listening-prompt-playback이 있고
// accessibility-element="true", 트리의 testid 순서에 대본이 없다.
test("[LP5] 대본 꺼짐에서 재생 조작은 그대로 있고 testid 순서에 대본이 없다", () => {
  const { container } = renderPrompt(transcriptOff);

  expect(control()).toHaveAttribute("accessibility-element", "true");

  const order = [...container.querySelectorAll("[data-testid]")].map((el) =>
    el.getAttribute("data-testid"),
  );
  expect(order).not.toContain("listening-prompt-text");
});

// LP6: 둘 다 꺼짐 — play 0회 그리고 대본 없음.
test("[LP6] 둘 다 꺼짐 — play 0회이고 대본이 없다", () => {
  const calls = stubHost();

  renderPrompt(bothOff);

  expect(playSources(calls)).toEqual([]);
  expect(screen.queryByTestId("listening-prompt-text")).not.toBeInTheDocument();
});

// LP7 (가드·앵커): initialSessionOptions(둘 다 켜짐) — play 1회 · 라벨 '멈춤' ·
// 대본 있음. 수용 기준 5·6의 「켜면 지금 동작 그대로」가 여기 선다. 스텁에서도
// 통과하므로 red로 세지 않는다.
test("[LP7] 초기값(둘 다 켜짐) — play 1회 · 라벨 '멈춤' · 대본 있음", () => {
  const calls = stubHost();

  renderPrompt(initialSessionOptions);

  expect(playSources(calls)).toEqual([SOURCE]);
  expect(control()).toHaveTextContent("멈춤");
  expect(control()).toHaveAttribute("accessibility-label", "멈춤");
  expect(screen.getByTestId("listening-prompt-text")).toHaveTextContent(TEXT);
});
