import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import {
  androidNetwork,
  androidNoMatch,
  audioFailed,
  iosNoSpeech,
  recognized,
  stubSpeechHost,
} from "../../lib/speech-host.test-support";
import type { SpeechHostResult } from "../../lib/speech-host.test-support";
import type { CatalogRoleplayTurn } from "../catalog-final/catalog-final.contract";
import { RoleplayTalkScreen } from "./RoleplayTalkScreen";

// `ui` 계층: 롤플레이 한 턴에서 못 알아들음 · 네트워크 실패가 안내 + Try again 버튼으로 서고, 그 버튼이 같은 턴을
// 다시 들으며 「Can't speak now」(건너뛰기)는 그대로 남는지 본다(ADR-0181). 진짜 불가에는 Try again이 없다.

const insets = { top: 0, bottom: 0, left: 0, right: 0 };
const turn = (id: string, line: string, accepted: string): CatalogRoleplayTurn => ({
  id,
  instruction: "What do you say?",
  line: { ko: line, roman: null, en: `(${line})` },
  tiles: [{ ko: accepted, roman: "" }],
  accepted: [accepted],
  replyTranslation: "No, I'm fine.",
  imageUrl: null,
});
const turns = [
  turn("RP-01", "봉투 드릴까요?", "아니요, 괜찮아요."),
  turn("RP-02", "삼천 원입니다.", "카드로 할게요."),
] as const;

const notCaughtText = "I didn't catch that. Tap the mic and try again.";
const networkText = "Couldn't connect to speech recognition. Check your connection and try again.";

type Finish = (results: readonly AnswerResult[], skippedCount: number) => void;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mount(results: readonly (SpeechHostResult | null)[]) {
  const speech = stubSpeechHost({ result: (attempt) => results[attempt] ?? null });
  const onFinish = vi.fn<Finish>();
  render(
    <RoleplayTalkScreen
      insets={insets}
      ordinal={1}
      counterpartName="점원"
      turns={turns}
      wildcards={[]}
      onFinish={onFinish}
      onExit={() => {}}
    />,
  );
  return { speech, onFinish };
}

const id = (testId: string) => screen.getByTestId(testId);
const maybe = (testId: string) => screen.queryByTestId(testId);
// 다시 말하기는 마이크 하나가 맡습니다 — 같은 동작의 「Try again」 버튼을 따로 두지 않습니다(2026-11-27 사용자 지시).
const retryButton = () => id("roleplay-mic-button");

test("[RT-M1] no-match는 안내 한 번 · 마이크 하나가 Try again(이름 · 문구) · 건너뛰기가 서고 판정은 없다", () => {
  const { speech } = mount([androidNoMatch]);

  fireEvent.tap(id("roleplay-mic-button"), {});

  expect(id("roleplay-talk-screen")).toHaveAttribute("data-phase", "missed");
  expect(id("roleplay-talk-missed")).toHaveAttribute("data-reason", "no-match");
  expect(id("roleplay-talk-missed")).toHaveTextContent(notCaughtText);
  expect(speech.announced.builtin).toEqual([notCaughtText]);
  expect(retryButton()).toHaveAttribute("accessibility-label", "Try again");
  expect(id("roleplay-mic-status")).toHaveTextContent("Try again");
  expect(screen.getAllByTestId("roleplay-mic-button")).toHaveLength(1);
  expect(maybe("roleplay-talk-missed-retry")).not.toBeInTheDocument();
  expect(id("roleplay-talk-skip")).toHaveTextContent("Can't speak now");
  expect(maybe("roleplay-talk-unavailable")).not.toBeInTheDocument();
  expect(maybe("roleplay-talk-reply")).not.toBeInTheDocument();
});

test("[RT-M2] Try again은 같은 턴을 다시 듣고, 맞히면 판정이 선다", () => {
  const { speech } = mount([androidNoMatch, null]);

  fireEvent.tap(id("roleplay-mic-button"), {});
  fireEvent.tap(retryButton(), {});

  expect(speech.calls.start).toBe(2);
  expect(id("roleplay-talk-screen")).toHaveAttribute("data-phase", "listening");
  expect(retryButton()).toHaveAttribute("accessibility-label", "Stop");
  expect(maybe("roleplay-talk-missed-retry")).not.toBeInTheDocument();
  expect(id("roleplay-talk-progress")).toHaveAttribute("accessibility-label", "Line 1 / 2");

  act(() => speech.pending[0]?.({ ...recognized("아니요, 괜찮아요"), isFinal: true }));

  expect(id("roleplay-talk-screen")).toHaveAttribute("data-phase", "heard");
});

test("[RT-M3] 못 알아들은 뒤 건너뛰기는 판정 없이 다음 턴이고 건너뜀 수에 든다", () => {
  const { onFinish } = mount([iosNoSpeech, androidNoMatch]);

  fireEvent.tap(id("roleplay-mic-button"), {});
  fireEvent.tap(id("roleplay-talk-skip"), {});
  expect(id("roleplay-talk-progress")).toHaveAttribute("accessibility-label", "Line 2 / 2");
  fireEvent.tap(id("roleplay-mic-button"), {});
  fireEvent.tap(id("roleplay-talk-skip"), {});

  expect(onFinish).toHaveBeenCalledWith([], 2);
});

test("[RT-M4] 네트워크 실패는 연결 안내와 Try again이다", () => {
  mount([androidNetwork]);

  fireEvent.tap(id("roleplay-mic-button"), {});

  expect(id("roleplay-talk-missed")).toHaveAttribute("data-reason", "network");
  expect(id("roleplay-talk-missed")).toHaveTextContent(networkText);
  expect(retryButton()).toHaveAttribute("accessibility-label", "Try again");
});

test("[RT-M5] 권한 거부에는 Try again 버튼이 없다(마이크 입력 실패는 ADR-0206 D5로 있다)", () => {
  mount([audioFailed]);
  fireEvent.tap(id("roleplay-mic-button"), {});
  expect(id("roleplay-talk-unavailable")).toHaveAttribute("data-reason", "failed");
  expect(retryButton()).toHaveAttribute("accessibility-label", "Try again");
  cleanup();

  stubSpeechHost({ microphone: "denied" });
  render(
    <RoleplayTalkScreen
      insets={insets}
      ordinal={1}
      counterpartName="점원"
      turns={turns}
      wildcards={[]}
      onFinish={() => {}}
      onExit={() => {}}
    />,
  );
  fireEvent.tap(id("roleplay-mic-button"), {});
  expect(id("roleplay-talk-unavailable")).toHaveAttribute("data-reason", "blocked");
  expect(maybe("roleplay-mic-status")).not.toBeInTheDocument();
  expect(retryButton()).not.toHaveAttribute("accessibility-label", "Try again");
});

test("[RT-M6] 마이크(Try again)를 누르면 같은 마이크가 Stop이 된다 — Stop은 한 곳에만 선다", () => {
  const { speech } = mount([androidNoMatch, null]);

  fireEvent.tap(id("roleplay-mic-button"), {});
  fireEvent.tap(retryButton(), {});

  expect(id("roleplay-talk-screen")).toHaveAttribute("data-phase", "listening");
  expect(retryButton()).toHaveAttribute("accessibility-label", "Stop");
  expect(maybe("roleplay-talk-missed-retry")).not.toBeInTheDocument();
  fireEvent.tap(retryButton(), {});
  expect(speech.calls.stop).toBe(1);
});

test("[RT-M7] 진짜 불가 안내도 서는 순간 한 번 알린다", () => {
  const speech = stubSpeechHost({ microphone: "denied" });
  render(
    <RoleplayTalkScreen
      insets={insets}
      ordinal={1}
      counterpartName="점원"
      turns={turns}
      wildcards={[]}
      onFinish={() => {}}
      onExit={() => {}}
    />,
  );
  fireEvent.tap(id("roleplay-mic-button"), {});
  expect(speech.announced.builtin).toEqual([id("roleplay-talk-unavailable").textContent]);
});
