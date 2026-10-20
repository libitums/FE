import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import {
  audioFailed,
  dictationOff,
  recognized,
  stubSpeechHost,
} from "../../lib/speech-host.test-support";
import type { CatalogRoleplayTurn } from "../catalog-final/catalog-final.contract";
import { RoleplayPreviewScreen } from "./RoleplayPreviewScreen";
import { RoleplayTalkScreen } from "./RoleplayTalkScreen";

// `ui` 계층: 롤플레이 미리보기 · 대화 — 상대 대사 다이얼로그 · 마이크 · 판정(「Me」 다이얼로그) · 다시 하기 ·
// 힌트 · 건너뛰기 · 끝 한 번을 실제 컴포넌트로 본다. 인식은 호스트 대역(`stubSpeechHost`)이다.

const insets = { top: 0, bottom: 0, left: 0, right: 0 };
const turn = (id: string, line: string, accepted: string, en: string): CatalogRoleplayTurn => ({
  id,
  instruction: "What do you say?",
  line: { ko: line, roman: null, en: `(${line})` },
  tiles: [{ ko: accepted, roman: "" }],
  accepted: [accepted],
  replyTranslation: en,
  imageUrl: null,
});
const turns = [
  turn("RP-01", "봉투 드릴까요?", "아니요, 괜찮아요.", "No, I'm fine."),
  turn("RP-02", "삼천 원입니다.", "카드로 할게요.", "I'll pay by card."),
] as const;

type Finish = (results: readonly AnswerResult[], skippedCount: number) => void;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mount(wildcards: readonly string[] = []) {
  const onFinish = vi.fn<Finish>();
  const onExit = vi.fn();
  render(
    <RoleplayTalkScreen
      insets={insets}
      ordinal={1}
      counterpartName="점원"
      turns={turns}
      wildcards={wildcards}
      onFinish={onFinish}
      onExit={onExit}
    />,
  );
  return { onFinish, onExit };
}

const id = (testId: string) => screen.getByTestId(testId);
const maybe = (testId: string) => screen.queryByTestId(testId);
const tapButton = (testId: string) =>
  fireEvent.tap(within(id(testId)).getByTestId("ui-lynx-button"), {});

test("[RT1] 첫 화면 — 상대 대사 다이얼로그 · Line 1 / 2 · 마이크 Speak · 힌트 · 건너뛰기, 판정은 없다", () => {
  stubSpeechHost();
  mount();
  expect(id("roleplay-talk-line")).toHaveTextContent("봉투 드릴까요?");
  expect(id("roleplay-talk-line")).toHaveTextContent("점원");
  expect(id("roleplay-talk-progress")).toHaveTextContent("Line 1 / 2");
  expect(id("roleplay-talk-mic")).toHaveAttribute("accessibility-label", "Speak");
  expect(id("roleplay-talk-show-hint")).toHaveTextContent("Show hint");
  expect(id("roleplay-talk-skip")).toHaveTextContent("Can't speak now");
  expect(maybe("roleplay-talk-reply")).not.toBeInTheDocument();
});

test("[RT2] 마이크 → 듣는 중(Stop) → 맞게 들으면 Me 다이얼로그 · Great · Next", () => {
  const host = stubSpeechHost();
  mount();
  fireEvent.tap(id("roleplay-talk-mic"), {});
  expect(host.calls.start).toBe(1);
  expect(id("roleplay-talk-screen")).toHaveAttribute("data-phase", "listening");
  expect(id("roleplay-talk-mic")).toHaveAttribute("accessibility-label", "Stop");
  act(() => {
    host.pending[0]?.({ status: "recognized", text: "아니요 괜찮아요", isFinal: true });
  });
  expect(id("roleplay-talk-verdict")).toHaveTextContent("Great");
  expect(id("roleplay-talk-reply")).toHaveTextContent("Me");
  expect(id("roleplay-talk-reply")).toHaveTextContent("아니요, 괜찮아요.");
  expect(maybe("roleplay-talk-retry")).not.toBeInTheDocument();
  expect(id("roleplay-talk-next")).toHaveTextContent("Next");
});

test("[RT3] 틀리면 들은 말과 정답을 보이고 Try again으로 다시 말할 수 있다", () => {
  stubSpeechHost({
    result: (attempt) => recognized(attempt === 0 ? "네 괜찮아요" : "아니요 괜찮아요"),
  });
  mount();
  fireEvent.tap(id("roleplay-talk-mic"), {});
  expect(id("roleplay-talk-verdict")).toHaveTextContent("Not quite");
  expect(id("roleplay-talk-reply")).toHaveTextContent("네 괜찮아요");
  expect(id("roleplay-talk-reply")).toHaveTextContent("Answer: 아니요, 괜찮아요.");
  tapButton("roleplay-talk-retry");
  fireEvent.tap(id("roleplay-talk-mic"), {});
  expect(id("roleplay-talk-verdict")).toHaveTextContent("Great");
});

test("[RT4] 힌트는 내가 할 말의 뜻을 펼치고, 다음 턴에서 접힌다", () => {
  stubSpeechHost({ result: () => recognized("아니요 괜찮아요") });
  mount();
  fireEvent.tap(id("roleplay-talk-show-hint"), {});
  expect(id("roleplay-talk-hint")).toHaveTextContent("Say: No, I'm fine.");
  expect(maybe("roleplay-talk-show-hint")).not.toBeInTheDocument();
  fireEvent.tap(id("roleplay-talk-mic"), {});
  tapButton("roleplay-talk-next");
  expect(id("roleplay-talk-progress")).toHaveTextContent("Line 2 / 2");
  expect(maybe("roleplay-talk-hint")).not.toBeInTheDocument();
});

test("[RT5] 인식 불가는 안내를 띄우고, 건너뛰기는 판정 없이 넘겨 끝에 한 번 결과를 올린다", () => {
  stubSpeechHost({
    result: (attempt) => (attempt === 0 ? audioFailed : recognized("카드로 할게요")),
  });
  const { onFinish } = mount();
  fireEvent.tap(id("roleplay-talk-mic"), {});
  expect(id("roleplay-talk-unavailable")).toHaveAttribute("data-reason", "failed");
  expect(id("roleplay-talk-unavailable")).toHaveTextContent("I didn't catch that.");
  fireEvent.tap(id("roleplay-talk-skip"), {});
  fireEvent.tap(id("roleplay-talk-mic"), {});
  expect(id("roleplay-talk-next")).toHaveTextContent("See results");
  tapButton("roleplay-talk-next");
  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith(["correct"], 1);
});

test("[RT6] 이름이 든 대답은 이름이 달리 들려도 맞다", () => {
  stubSpeechHost({ result: () => recognized("엠마로 예약했어요") });
  render(
    <RoleplayTalkScreen
      insets={insets}
      ordinal={2}
      counterpartName="사장님"
      turns={[turn("RP-01", "이름이 어떻게 되세요?", "Emma로 예약했어요.", "I booked under Emma.")]}
      wildcards={["Emma"]}
      onFinish={() => {}}
      onExit={() => {}}
    />,
  );
  fireEvent.tap(id("roleplay-talk-mic"), {});
  expect(id("roleplay-talk-verdict")).toHaveTextContent("Great");
});

test("[RT7] 나가기는 듣던 것을 멈추고 onExit를 부른다", () => {
  const host = stubSpeechHost();
  const { onExit } = mount();
  fireEvent.tap(id("roleplay-talk-mic"), {});
  fireEvent.tap(within(id("roleplay-talk-back")).getByTestId("ui-lynx-round-button"), {});
  expect(host.calls.stop).toBeGreaterThan(0);
  expect(onExit).toHaveBeenCalledTimes(1);
});

test("[RP1] 미리보기 — 에피소드 · Roleplay · 제목, 상대 · 대사 수 알약, 안내 다이얼로그, Start roleplay", () => {
  const onStart = vi.fn();
  render(
    <RoleplayPreviewScreen
      insets={insets}
      ordinal={1}
      title="Buying Water"
      counterpartName="편의점 점원"
      lineCount={3}
      imageUrl={null}
      onStart={onStart}
      onExit={() => {}}
      speechNotice={null}
      onSpeechNoticeAction={() => {}}
    />,
  );
  expect(id("roleplay-preview-title")).toHaveTextContent("Episode 1.");
  expect(id("roleplay-preview-subtitle")).toHaveTextContent("Roleplay · Buying Water");
  expect(id("roleplay-preview-chips")).toHaveTextContent("with 편의점 점원");
  expect(id("roleplay-preview-chips")).toHaveTextContent("3 lines");
  expect(id("roleplay-preview-body")).toHaveAttribute(
    "accessibility-label",
    "Act out this scene with 편의점 점원. Answer each line out loud.",
  );
  tapButton("roleplay-preview-start");
  expect(onStart).toHaveBeenCalledTimes(1);
});

test("[RT8] 듣지 못한 까닭마다 안내가 다르다 — 받아쓰기 꺼짐 · 권한 거부", () => {
  stubSpeechHost({ result: () => dictationOff });
  mount();
  fireEvent.tap(id("roleplay-talk-mic"), {});
  expect(id("roleplay-talk-unavailable")).toHaveAttribute("data-reason", "dictation-off");
  expect(id("roleplay-talk-unavailable")).toHaveTextContent("Enable Dictation");
  cleanup();
  stubSpeechHost({ microphone: "denied" });
  mount();
  fireEvent.tap(id("roleplay-talk-mic"), {});
  expect(id("roleplay-talk-unavailable")).toHaveAttribute("data-reason", "blocked");
  expect(id("roleplay-talk-unavailable")).toHaveTextContent(
    "Allow Microphone and Speech Recognition",
  );
});

test("[RP2] 권한이 거부되면 미리보기에 「Open Settings」 · 「Not now」 안내가 뜨고 고른 것을 알린다", () => {
  const onAction = vi.fn<(action: string) => void>();
  render(
    <RoleplayPreviewScreen
      insets={insets}
      ordinal={1}
      title="Buying Water"
      counterpartName="편의점 점원"
      lineCount={3}
      imageUrl={null}
      onStart={() => {}}
      onExit={() => {}}
      speechNotice="blocked"
      onSpeechNoticeAction={onAction}
    />,
  );
  const notice = id("roleplay-preview-speech-notice");
  expect(notice).toHaveTextContent("Turn on the microphone");
  expect(notice).toHaveTextContent("Open Settings");
  expect(notice).toHaveTextContent("Not now");
  fireEvent.tap(within(id("ui-lynx-dialog-action-settings")).getByTestId("ui-lynx-button"), {});
  expect(onAction).toHaveBeenCalledWith("settings");
});
