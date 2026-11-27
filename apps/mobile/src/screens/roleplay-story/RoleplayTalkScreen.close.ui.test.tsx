import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen, fireEvent, within } from "@lynx-js/react/testing-library";

import { recognized, stubSpeechHost } from "../../lib/speech-host.test-support";
import { UiCopyContext, uiCopyFor } from "../../lib/ui-copy";
import type { UiLanguage } from "../../lib/ui-copy.contract";
import type { CatalogRoleplayTurn } from "../catalog-final/catalog-final.contract";
import { RoleplayTalkScreen } from "./RoleplayTalkScreen";

// `ui` 계층(사용자 2026-11-27 「완벽한 정답이 아닐 경우 답 보여지게」): close 판정(허용 오차 안의 맞음)에 모범 정답을 보인다 —
// 말하기 퀴즈 close와 같은 문구 키(Almost perfect · Model answer · You said)와 같은 음절 표시.

const insets = { top: 0, bottom: 0, left: 0, right: 0 };
const turn = (
  id: string,
  line: string,
  accepted: string,
  meaning: string,
): CatalogRoleplayTurn => ({
  id,
  instruction: "What do you say?",
  line: { ko: line, roman: null, en: null },
  tiles: [{ ko: accepted, roman: "" }],
  accepted: [accepted],
  replyTranslation: meaning,
  imageUrl: null,
});
const turns = [
  turn("RP-01", "봉투 드릴까요?", "아니요, 괜찮아요.", "No, I'm fine."),
  turn("RP-02", "삼천 원입니다.", "카드로 할게요.", "I'll pay by card."),
] as const;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function mount(heard: string, language: UiLanguage = "en") {
  stubSpeechHost({ result: () => recognized(heard) });
  render(
    <UiCopyContext.Provider value={uiCopyFor(language)}>
      <RoleplayTalkScreen
        insets={insets}
        ordinal={1}
        counterpartName="점원"
        turns={turns}
        wildcards={[]}
        onFinish={vi.fn()}
        onExit={vi.fn()}
      />
    </UiCopyContext.Provider>,
  );
  fireEvent.tap(screen.getByTestId("roleplay-mic-button"), {});
}

const id = (testId: string) => screen.getByTestId(testId);
const maybe = (testId: string) => screen.queryByTestId(testId);
const line = () => id("roleplay-talk-progress").getAttribute("accessibility-label");

test("[RT-C1] close — 맞음 표시와 함께 Almost perfect · Model answer 정답(로마자 · 뜻) · You said(다른 음절 표시)", () => {
  mount("아니요 괜찮아여");
  expect(id("roleplay-talk-verdict")).toHaveTextContent("Great");
  expect(id("roleplay-talk-close-chip")).toHaveTextContent("Almost perfect");
  expect(id("roleplay-talk-close")).toHaveTextContent("Model answer");
  expect(id("roleplay-talk-close-answer")).toHaveTextContent("아니요, 괜찮아요.");
  expect(id("roleplay-talk-close-answer")).toHaveTextContent("aniyo");
  expect(id("roleplay-talk-close-answer")).toHaveTextContent("No, I'm fine.");
  expect(id("roleplay-talk-close")).toHaveTextContent("You said");
  const differs = within(id("roleplay-talk-close-heard")).getAllByText("여");
  expect(differs[0]).toHaveAttribute("data-differs", "true");
});

test("[RT-C2] close는 저절로 넘어가지 않는다 — 읽고 Next를 누르면 넘어간다", () => {
  mount("아니요 괜찮아여");
  act(() => {
    vi.advanceTimersByTime(15_000);
  });
  expect(line()).toBe("Line 1 / 2");
  fireEvent.tap(within(id("roleplay-talk-next")).getByTestId("ui-lynx-button"), {});
  expect(line()).toBe("Line 2 / 2");
});

test("[RT-C3] perfect는 모범 정답 패널이 없고 저절로 넘어간다(그대로)", () => {
  mount("아니요 괜찮아요");
  expect(maybe("roleplay-talk-close")).not.toBeInTheDocument();
  act(() => {
    vi.advanceTimersByTime(2000);
  });
  expect(line()).toBe("Line 2 / 2");
});

test("[RT-C5] close는 서는 순간 모범 정답까지 한 번 알린다", () => {
  const host = stubSpeechHost({ result: () => recognized("아니요 괜찮아여") });
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
  fireEvent.tap(screen.getByTestId("roleplay-mic-button"), {});
  // 판정 · 모범 정답은 같은 갱신에 서므로 알림은 한 번뿐입니다(의존성에 judgement · copy를 넣어도 두 번 나가지 않음).
  expect(host.announced.builtin.filter((text) => text.startsWith("Great"))).toEqual([
    "Great, Almost perfect. Model answer: 아니요, 괜찮아요.",
  ]);
});

test("[RT-C4] 앱 언어(ja) — 같은 문구 키의 그 언어 글자", () => {
  mount("아니요 괜찮아여", "ja");
  const ja = uiCopyFor("ja").speakWord.result;
  expect(id("roleplay-talk-close-chip")).toHaveTextContent(ja.almostPerfect);
  expect(id("roleplay-talk-close")).toHaveTextContent(ja.modelAnswer);
  expect(id("roleplay-talk-close")).toHaveTextContent(ja.youSaid);
});
