import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { recognized, stubSpeechHost } from "../../lib/speech-host.test-support";
import type { CatalogRoleplayTurn } from "../catalog-final/catalog-final.contract";
import { RoleplayTalkScreen } from "./RoleplayTalkScreen";

// `ui` 계층(2026-11-27 제보 — 정답 음성이 나오다가 중간에 다른 사람 음성): 맞힌 뒤 소리 요청 순서를 호스트 대역으로 본다. 대역은
// 실제 호스트처럼 재생기가 하나다 — 새 `play`가 앞 소리를 끊는다. 끝나기 전에 끊긴 소리 수가 「겹침」이다.

const insets = { top: 0, bottom: 0, left: 0, right: 0 };
const turn = (id: string, line: string, accepted: string): CatalogRoleplayTurn => ({
  id,
  instruction: "What do you say?",
  line: { ko: line, roman: null, en: null },
  tiles: [{ ko: accepted, roman: "" }],
  accepted: [accepted],
  replyTranslation: null,
  imageUrl: null,
  counterpartAudioSource: `counterpart-${id}`,
  replyAudioSource: `reply-${id}`,
});
const turns = [
  turn("RP-01", "봉투 드릴까요?", "아니요, 괜찮아요."),
  turn("RP-02", "삼천 원입니다.", "카드로 할게요."),
] as const;

type Player = {
  /** 요청 순서 — `play:<source>` · `stop`. */
  readonly calls: string[];
  /** 끝나기 전에 다른 `play`로 끊긴 소리 — 겹침(사용자에게는 「중간에 다른 목소리」). */
  readonly cutOff: string[];
  /** 지금 재생 중인 소리를 끝냅니다(호스트의 완료 콜백). */
  readonly finish: () => void;
};

function stubPlayer(): Player {
  const calls: string[] = [];
  const cutOff: string[] = [];
  let current: { source: string; done: (r: unknown) => void } | null = null;
  const modules = (globalThis as unknown as { NativeModules: Record<string, unknown> })
    .NativeModules;
  vi.stubGlobal("NativeModules", {
    ...modules,
    AudioPlaybackModule: {
      play: (source: string, done: (r: unknown) => void) => {
        calls.push(`play:${source}`);
        if (current !== null) cutOff.push(current.source);
        current = { source, done };
      },
      stop: () => {
        calls.push("stop");
        current = null;
      },
      pause: () => {},
      resume: () => {},
    },
  });
  return {
    calls,
    cutOff,
    finish: () => {
      const playing = current;
      current = null;
      act(() => playing?.done({}));
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function mount(): Player {
  stubSpeechHost({ result: () => recognized("아니요 괜찮아요") });
  const player = stubPlayer();
  render(
    <RoleplayTalkScreen
      insets={insets}
      ordinal={1}
      counterpartName="점원"
      turns={turns}
      wildcards={[]}
      onFinish={vi.fn()}
      onExit={vi.fn()}
    />,
  );
  return player;
}

const id = (testId: string) => screen.getByTestId(testId);
const last = (calls: readonly string[]) => calls[calls.length - 1];
const line = () => id("roleplay-talk-progress").getAttribute("accessibility-label");
const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

test("[RT-A1] 맞히면 내 문장 소리가 끝날 때까지 다음 턴으로 넘어가지 않는다 — 2초가 지나도 끊지 않는다", () => {
  const player = mount();
  player.finish(); // 상대 첫 줄이 끝남
  fireEvent.tap(id("roleplay-mic-button"), {});
  expect(last(player.calls)).toBe("play:reply-RP-01");

  wait(2000);
  wait(1500);
  expect(line()).toBe("Line 1 / 2");
  expect(last(player.calls)).toBe("play:reply-RP-01");

  player.finish(); // 내 문장 소리가 끝남
  expect(line()).toBe("Line 2 / 2");
  expect(last(player.calls)).toBe("play:counterpart-RP-02");
  expect(player.cutOff).toEqual([]);
});

test("[RT-A2] 내 문장 소리가 2초보다 짧으면 2초에 넘어간다", () => {
  const player = mount();
  player.finish();
  fireEvent.tap(id("roleplay-mic-button"), {});
  wait(500);
  player.finish();
  expect(line()).toBe("Line 1 / 2");
  wait(1500);
  expect(line()).toBe("Line 2 / 2");
  expect(player.cutOff).toEqual([]);
});

test("[RT-A3] Next를 누르면 내 문장 소리를 멈추고 바로 넘어간다 — 멈춘 뒤에 다음 소리", () => {
  const player = mount();
  player.finish();
  fireEvent.tap(id("roleplay-mic-button"), {});
  fireEvent.tap(within(id("roleplay-talk-next")).getByTestId("ui-lynx-button"), {});
  expect(line()).toBe("Line 2 / 2");
  expect(player.calls.slice(-2)).toEqual(["stop", "play:counterpart-RP-02"]);
  expect(player.cutOff).toEqual([]);
});

test("[RT-A4] 끝 신호가 오지 않아도 상한 시간 뒤에는 넘어간다", () => {
  const player = mount();
  player.finish();
  fireEvent.tap(id("roleplay-mic-button"), {});
  wait(9_900);
  expect(line()).toBe("Line 1 / 2");
  wait(200);
  expect(line()).toBe("Line 2 / 2");
});

test("[RT-A5] 앱이 뒤로 가면 소리를 멈추고 저절로 넘기지 않는다 — 돌아와 누르면 넘어간다", () => {
  const player = mount();
  player.finish();
  fireEvent.tap(id("roleplay-mic-button"), {});
  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit("appDidEnterBackground", []);
  });
  expect(last(player.calls)).toBe("stop");
  wait(12_000);
  expect(line()).toBe("Line 1 / 2");
  fireEvent.tap(within(id("roleplay-talk-next")).getByTestId("ui-lynx-button"), {});
  expect(line()).toBe("Line 2 / 2");
});
