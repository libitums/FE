import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { MicPermissionEvent } from "../../lib/mic-permission-event.contract";
import { audioFailed, stubSpeechHost } from "../../lib/speech-host.test-support";
import type { SpeechHostOptions, SpeechHostResult } from "../../lib/speech-host.test-support";
import type { CatalogRoleplayTurn } from "../catalog-final/catalog-final.contract";
import { RoleplayTalkScreen } from "./RoleplayTalkScreen";

// `ui` 계층: 롤플레이 대화의 인식 실패(다른 문구 · Try again) · 대화 중 권한 거부 시트(ADR-0206).

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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mount(host: SpeechHostOptions, results: readonly (SpeechHostResult | null)[] = []) {
  const speech = stubSpeechHost({
    answerStatus: true,
    storage: new Map([["libitum.mic-primer-seen", "1"]]),
    result: (attempt) => results[attempt] ?? null,
    ...host,
  });
  const events: MicPermissionEvent[] = [];
  render(
    <RoleplayTalkScreen
      insets={insets}
      ordinal={1}
      counterpartName="점원"
      turns={turns}
      wildcards={[]}
      onFinish={() => {}}
      onExit={() => {}}
      mic={{ lessonKey: null, onEvent: (event) => events.push(event) }}
    />,
  );
  return { speech, events };
}

const id = (testId: string) => screen.getByTestId(testId);
const maybe = (testId: string) => screen.queryByTestId(testId);
const tapMic = () => fireEvent.tap(id("roleplay-talk-mic"), {});

test("RT-P1. 인식 실패는 거부와 다른 문구와 Try again 버튼이고, 누르면 같은 턴을 다시 듣는다", () => {
  const { speech } = mount({}, [audioFailed, null]);

  tapMic();
  expect(id("roleplay-talk-unavailable")).toHaveAttribute("data-reason", "failed");
  expect(id("roleplay-talk-unavailable")).toHaveTextContent(
    "Something went wrong while listening. Try again.",
  );
  const retry = id("roleplay-talk-missed-retry");
  expect(retry).toHaveTextContent("Try again");

  fireEvent.tap(within(retry).getByTestId("ui-lynx-button"), {});
  expect(speech.calls.start).toBe(2);
  expect(id("roleplay-talk-screen")).toHaveAttribute("data-phase", "listening");
  expect(id("roleplay-talk-missed-retry")).toHaveTextContent("Stop");
});

test("RT-P2. 대화 중 시스템 창에서 거부하면 거부 시트가 서고, Continue without speaking 뒤에는 다시 띄우지 않는다", () => {
  const { events } = mount({ microphone: "not-determined", onAsk: "denied" });

  // 대화 화면은 열 때 확인하지 않습니다 — 미리보기 시작 단추가 맡습니다.
  expect(maybe("mic-permission-sheet")).not.toBeInTheDocument();
  tapMic();
  expect(id("roleplay-talk-unavailable")).toHaveAttribute("data-reason", "blocked");
  expect(id("mic-permission-sheet")).toHaveAttribute("data-sheet", "denied");
  expect(events).toEqual([
    { name: "mic_permission_sheet_shown", surface: "roleplay", sheet: "denied" },
  ]);

  fireEvent.tap(
    within(id("ui-lynx-bottom-sheet-action-continue")).getByTestId("ui-lynx-button"),
    {},
  );
  expect(maybe("mic-permission-sheet")).not.toBeInTheDocument();
  expect(id("roleplay-talk-skip")).toBeInTheDocument();

  tapMic();
  expect(maybe("mic-permission-sheet")).not.toBeInTheDocument();
});
