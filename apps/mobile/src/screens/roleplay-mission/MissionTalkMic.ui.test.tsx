import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { stubSpeechHost } from "../../lib/speech-host.test-support";
import type { SpeechHostOptions } from "../../lib/speech-host.test-support";
import { MissionTalkScreen } from "./MissionTalkScreen";
import { MISSION_FIXTURE_IDS } from "./mission-fixture";
import {
  cafeCard,
  id,
  insets,
  maybe,
  sessionAfter,
  settle,
  startedActions,
  voicePorts,
} from "./mission-ui.test-support";
import type { MissionVoicePorts } from "./roleplay-mission.contract";

// `ui` 계층(MM-UI1 ~): 미션 마이크가 대본형 롤플레이와 같은 권한 · 단추 계층을 타는가 — 사전 안내(처음 마이크를 누를 때) → 시스템
// 권한 → 거부 시트(ADR-0206, main의 `MicPermissionSheet` 그대로), 마이크 하나(Speak · Stop · Try again), 기기 쪽 실패는 ADR-0206 문구,
// 한 번에 한 목소리(녹음 중 재생 안 함 · 앱이 뒤로 가면 녹음 버림 · 재생 멈춤). 기기 · 서버 · 호스트 권한은 가짜.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const talking = sessionAfter(startedActions);
const sheet = () => maybe("mic-permission-sheet");
const tapSheet = (action: string) =>
  fireEvent.tap(
    within(screen.getByTestId(`ui-lynx-bottom-sheet-action-${action}`)).getByTestId(
      "ui-lynx-button",
    ),
    {},
  );

function mount(voice: MissionVoicePorts = voicePorts()) {
  render(
    <MissionTalkScreen
      insets={insets}
      card={cafeCard}
      state={talking}
      onSend={() => undefined}
      onHint={() => undefined}
      onDismissHint={() => undefined}
      onQuit={() => undefined}
      onKeepGoing={() => undefined}
      onFinish={() => undefined}
      voice={voice}
    />,
  );
}

const host = (options: SpeechHostOptions) =>
  stubSpeechHost({ answerStatus: true, storage: new Map(), ...options });

test("MM-UI1 묻지 않은 권한이면 처음 마이크를 누를 때 사전 안내 — Allow → 허용이면 시트가 닫히고, 다시 누르면 녹음", async () => {
  const speech = host({ microphone: "not-determined", onAsk: "granted" });
  const voice = voicePorts();
  mount(voice);
  fireEvent.tap(id("roleplay-mission-mic"), {});
  await settle();
  expect(sheet()).toHaveAttribute("data-sheet", "prime");
  expect(voice.device.recording()).toBe(false);
  tapSheet("allow");
  await settle();
  expect(speech.calls.request).toBe(1);
  expect(sheet()).not.toBeInTheDocument();
  // 허용 뒤에도 저절로 듣지 않습니다(ADR-0206 D1) — 마이크를 눌러야 녹음합니다.
  expect(voice.device.recording()).toBe(false);
  fireEvent.tap(id("roleplay-mission-mic"), {});
  await settle();
  expect(voice.device.recording()).toBe(true);
  expect(id("roleplay-mission-mic")).toHaveAttribute("accessibility-label", "Stop");
});

test("MM-UI2 사전 안내의 Not now는 시트만 닫는다 — 글 입력은 그대로, 다음 누름은 안내 없이 녹음(시스템 창은 호스트 몫)", async () => {
  host({ microphone: "not-determined" });
  const voice = voicePorts();
  mount(voice);
  fireEvent.tap(id("roleplay-mission-mic"), {});
  await settle();
  tapSheet("not-now");
  await settle();
  expect(sheet()).not.toBeInTheDocument();
  expect(id("roleplay-mission-input")).toBeInTheDocument();
  fireEvent.tap(id("roleplay-mission-mic"), {});
  await settle();
  expect(sheet()).not.toBeInTheDocument();
  expect(voice.device.recording()).toBe(true);
});

test("MM-UI3 거부면 거부 시트(Open Settings) · 안내 — Continue without speaking 뒤에는 다시 띄우지 않는다", async () => {
  const speech = host({ microphone: "denied" });
  const voice = voicePorts();
  mount(voice);
  fireEvent.tap(id("roleplay-mission-mic"), {});
  await settle();
  expect(sheet()).toHaveAttribute("data-sheet", "denied");
  expect(voice.device.recording()).toBe(false);
  expect(id("roleplay-mission-composer-note")).toHaveTextContent(
    "Allow microphone access in Settings to speak.",
  );
  tapSheet("settings");
  expect(speech.calls.openSettings).toBe(1);
  tapSheet("continue");
  await settle();
  expect(sheet()).not.toBeInTheDocument();
  fireEvent.tap(id("roleplay-mission-mic"), {});
  await settle();
  expect(sheet()).not.toBeInTheDocument();
  expect(id("roleplay-mission-composer-note")).toHaveTextContent("Allow microphone access");
});

test("MM-UI4 녹음 장치가 권한 거부로 시작하지 못해도 같은 거부 시트가 선다", async () => {
  mount(voicePorts({ device: { mic: "denied" } }));
  fireEvent.tap(id("roleplay-mission-mic"), {});
  await settle();
  expect(sheet()).toHaveAttribute("data-sheet", "denied");
});

test("MM-UI5 녹음 뒤 기기 쪽 실패는 ADR-0206 문구 · 마이크가 「Try again」, 장치 없음은 마이크가 꺼진다", async () => {
  const voice = voicePorts();
  const failing = {
    ...voice,
    device: { ...voice.device, stopRecording: () => Promise.resolve(null) },
  };
  mount(failing);
  fireEvent.tap(id("roleplay-mission-mic"), {});
  await settle();
  fireEvent.tap(id("roleplay-mission-mic"), {});
  await settle();
  expect(id("roleplay-mission-composer-note")).toHaveTextContent(
    "Something went wrong while listening. Try again.",
  );
  expect(id("roleplay-mission-mic")).toHaveAttribute("accessibility-label", "Try again");
  cleanup();
  mount(voicePorts({ device: { mic: "unavailable" } }));
  fireEvent.tap(id("roleplay-mission-mic"), {});
  await settle();
  expect(id("roleplay-mission-composer-note")).toHaveTextContent(
    "Speaking isn't available right now. You can type instead.",
  );
  expect(id("roleplay-mission-mic")).toHaveAttribute("accessibility-traits", "disabled");
  expect(id("roleplay-mission-mic")).toHaveAttribute("accessibility-label", "Speak");
});

test("MM-UI6 한 번에 한 목소리 — 녹음 중에는 다시 듣기가 재생하지 않고, 앱이 뒤로 가면 녹음을 버리고 재생을 멈춘다", async () => {
  const voice = voicePorts();
  mount(voice);
  await settle();
  const replay = `roleplay-mission-replay-${MISSION_FIXTURE_IDS.opening}`;
  fireEvent.tap(id("roleplay-mission-mic"), {});
  await settle();
  const played = voice.device.played.length;
  fireEvent.tap(id(replay), {});
  await settle();
  expect(voice.device.played.length).toBe(played);
  const stops = voice.device.stops();
  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit("appDidEnterBackground", []);
  });
  await settle();
  expect(voice.device.recording()).toBe(false);
  expect(voice.device.stops()).toBeGreaterThan(stops);
  expect(id("roleplay-mission-mic")).toHaveAttribute("data-listening", "false");
  expect(id("roleplay-mission-mic")).toHaveAttribute("accessibility-label", "Speak");
});
