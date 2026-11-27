import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, within } from "@lynx-js/react/testing-library";

import { fakeHeard } from "./mission-fake-rules";
import { MissionTalkScreen } from "./MissionTalkScreen";
import { MISSION_FIXTURE_IDS } from "./mission-fixture";
import {
  A1,
  U1,
  cafeCard,
  event,
  id,
  insets,
  maybe,
  sessionAfter,
  settle,
  startedActions,
  tapButton,
  tapRound,
  voicePorts,
} from "./mission-ui.test-support";
import type { MissionInputMode, MissionSessionState } from "./roleplay-mission.contract";

// `ui` 계층(MV-UI1 ~): 미션 대화의 음성(파이프라인 문서 §6 · §10.2 ⑤) — 서버 받아 적기의 바로 보내기 / 「Did I hear that right?」 확인,
// 실패 안내(짧음 · 못 들음 · 권한), 상대역 말 자동 재생 · 다시 듣기 · 말하기 시작하면 멈춤, 힌트 예문 듣기. 기기 · 서버는 가짜.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mount(state: MissionSessionState, voice = voicePorts()) {
  const onSend = vi.fn<(text: string, mode: MissionInputMode) => void>();
  render(
    <MissionTalkScreen
      insets={insets}
      card={cafeCard}
      state={state}
      onSend={onSend}
      onHint={() => undefined}
      onDismissHint={() => undefined}
      onQuit={() => undefined}
      onKeepGoing={() => undefined}
      onFinish={() => undefined}
      voice={voice}
    />,
  );
  return { onSend };
}

const talking = sessionAfter(startedActions);

async function speakOnce(): Promise<void> {
  fireEvent.tap(id("roleplay-mission-mic"), {});
  await settle();
  fireEvent.tap(id("roleplay-mission-mic"), {});
  await settle();
}

test("MV-UI1 확신이 낮으면 받아 적은 글을 입력 칸에 넣고 확인을 부탁한다 — 보내면 voice", async () => {
  const voice = voicePorts({
    source: {
      heard: [fakeHeard("가지고 가요.", false, "low_confidence")],
    },
  });
  const { onSend } = mount(talking, voice);
  await speakOnce();
  expect(onSend).not.toHaveBeenCalled();
  expect(id("roleplay-mission-heard-check")).toHaveTextContent("Did I hear that right?");
  // 마이크 하나가 다시 말하기를 맡습니다(ADR-0206 D5 개정) — 따로 된 「Say it again」 글 단추가 없습니다.
  expect(maybe("roleplay-mission-say-again")).not.toBeInTheDocument();
  expect(id("roleplay-mission-mic")).toHaveAttribute("accessibility-label", "Try again");
  expect(id("roleplay-mission-mic")).toHaveAttribute("data-mode", "tryAgain");
  expect(id("roleplay-mission-send")).toHaveAttribute("data-enabled", "true");
  fireEvent.tap(id("roleplay-mission-send"), {});
  expect(onSend).toHaveBeenCalledWith("가지고 가요.", "voice");
  expect(maybe("roleplay-mission-heard-check")).not.toBeInTheDocument();
});

test("MV-UI2 한국어로 들리지 않으면 다른 안내 — 마이크(Try again)를 누르면 녹음을 다시 연다", async () => {
  const voice = voicePorts({
    source: {
      heard: [fakeHeard("I will pay by card", false, "not_korean")],
    },
  });
  mount(talking, voice);
  await speakOnce();
  expect(id("roleplay-mission-heard-check")).toHaveTextContent(
    "That didn't sound like Korean. Try again?",
  );
  fireEvent.tap(id("roleplay-mission-mic"), {});
  await settle();
  expect(id("roleplay-mission-mic")).toHaveAttribute("data-listening", "true");
  expect(id("roleplay-mission-mic")).toHaveAttribute("accessibility-label", "Stop");
  expect(maybe("roleplay-mission-heard-check")).not.toBeInTheDocument();
});

test("MV-UI3 실패 안내 — 0.4초 미만 · 빈 결과 · 서버 몰림 · 권한 거부(턴은 나가지 않는다)", async () => {
  const cases = [
    { voice: voicePorts({ device: { seconds: 0.2 } }), note: "Hold on a bit longer" },
    {
      voice: voicePorts({ source: { heard: [{ kind: "failed", error: "speech_empty" }] } }),
      note: "We couldn't hear you. Try again or type.",
    },
    {
      voice: voicePorts({ source: { heard: [{ kind: "failed", error: "speech_busy" }] } }),
      note: "Too many requests right now.",
    },
  ];
  for (const { voice, note } of cases) {
    const { onSend } = mount(talking, voice);
    await speakOnce();
    expect(id("roleplay-mission-composer-note")).toHaveTextContent(note);
    expect(onSend).not.toHaveBeenCalled();
    cleanup();
  }
  mount(talking, voicePorts({ device: { mic: "denied" } }));
  fireEvent.tap(id("roleplay-mission-mic"), {});
  await settle();
  expect(id("roleplay-mission-composer-note")).toHaveTextContent(
    "Allow microphone access in Settings to speak.",
  );
  expect(id("roleplay-mission-mic")).toHaveAttribute("data-listening", "false");
});

test("MV-UI4 30초 상한에 닿으면 저절로 받아 적고 상한 안내가 남는다", async () => {
  const voice = voicePorts({
    source: { heard: [fakeHeard("네", false, "too_short")] },
  });
  mount(talking, voice);
  fireEvent.tap(id("roleplay-mission-mic"), {});
  await settle();
  voice.device.hitLimit();
  await settle();
  expect(id("roleplay-mission-heard-check")).toHaveTextContent("Did I hear that right?");
  cleanup();
  const failing = voicePorts({
    source: { heard: [{ kind: "failed", error: "speech_unavailable" }] },
  });
  mount(talking, failing);
  fireEvent.tap(id("roleplay-mission-mic"), {});
  await settle();
  failing.device.hitLimit();
  await settle();
  expect(id("roleplay-mission-composer-note")).toHaveTextContent(
    "Speech recognition isn't responding.",
  );
});

test("MV-UI5 진입 대사를 자동 재생하고, 다시 듣기 · 마이크를 누르면 재생을 멈춘다", async () => {
  const voice = voicePorts();
  mount(talking, voice);
  await settle();
  const opening = MISSION_FIXTURE_IDS.opening;
  expect(voice.device.played).toEqual([`fake://tts/${opening}`]);
  const replay = id(`roleplay-mission-replay-${opening}`);
  expect(replay).toHaveAttribute("accessibility-label", "Play again");
  expect(replay).toHaveAttribute("data-play", "playing");
  const stopsBefore = voice.device.stops();
  fireEvent.tap(id("roleplay-mission-mic"), {});
  expect(voice.device.stops()).toBeGreaterThan(stopsBefore);
  await settle();
  expect(id(`roleplay-mission-replay-${opening}`)).toHaveAttribute("data-play", "idle");
  fireEvent.tap(id("roleplay-mission-mic"), {});
  await settle();
  fireEvent.tap(id(`roleplay-mission-replay-${opening}`), {});
  await settle();
  expect(voice.device.played).toEqual([`fake://tts/${opening}`, `fake://tts/${opening}`]);
});

test("MV-UI6 상대역 답은 한 번만 자동 재생하고, 합성이 실패하면 글자만 남는다", async () => {
  const replied = sessionAfter([
    ...startedActions,
    { type: "send", text: "아메리카노 주세요", inputMode: "text" },
    event("start", { userMessageId: U1, assistantMessageId: A1 }),
    event("delta", { segment: 0, kind: "speech", text: "네, 아메리카노요." }),
    event("done", { assistantMessageId: A1, creditsSpent: 0, balance: null }),
  ]);
  const voice = voicePorts();
  mount(replied, voice);
  await settle();
  expect(voice.device.played).toEqual([`fake://tts/${A1}`]);
  cleanup();
  const silent = voicePorts({ source: { ttsFails: true } });
  mount(replied, silent);
  await settle();
  expect(silent.device.played).toEqual([]);
  expect(id(`roleplay-mission-replay-${A1}:0`)).toHaveAttribute("data-play", "idle");
  expect(id("roleplay-mission-log")).toHaveTextContent("네, 아메리카노요.");
});

test("MV-UI7 힌트 예문 듣기 — 힌트 번호로 합성해 재생한다, 번호가 없으면 듣기 단추가 없다", async () => {
  const voice = voicePorts();
  mount(
    sessionAfter([
      ...startedActions,
      { type: "hint-requested" },
      {
        type: "hint-received",
        value: {
          goalId: "pay",
          ko: "카드로 할게요.",
          roman: "kadeuro halgeyo.",
          meaning: "I'll pay by card.",
          hintsLeft: 2,
          hintNo: 1,
        },
      },
    ]),
    voice,
  );
  await settle();
  tapButton("roleplay-mission-hint-listen");
  await settle();
  // 대본형 Hint 단계와 같은 단추 · 같은 문구(`roleplayStory.hearIt`).
  expect(id("roleplay-mission-hint-listen")).toHaveTextContent("Hear it");
  expect(voice.device.played.at(-1)).toBe("fake://tts/hint-1");
  expect(id("roleplay-mission-hint-listen")).toHaveAttribute("data-play", "true");
  tapButton("roleplay-mission-hint-close");
  cleanup();
  mount(
    sessionAfter([
      ...startedActions,
      { type: "hint-requested" },
      {
        type: "hint-received",
        value: { goalId: "pay", ko: "카드로 할게요.", roman: "", meaning: "", hintsLeft: 2 },
      },
    ]),
  );
  expect(id("roleplay-mission-hint-card")).toBeInTheDocument();
  expect(maybe("roleplay-mission-hint-listen")).not.toBeInTheDocument();
});

test("MV-UI8 그만두기 확인을 띄우면 녹음을 버린다(보내지 않음)", async () => {
  const voice = voicePorts();
  const { onSend } = mount(talking, voice);
  fireEvent.tap(id("roleplay-mission-mic"), {});
  await settle();
  expect(voice.device.recording()).toBe(true);
  tapRound("roleplay-mission-talk-quit");
  await settle();
  expect(voice.device.recording()).toBe(false);
  expect(onSend).not.toHaveBeenCalled();
  expect(id("roleplay-mission-mic")).toHaveAttribute("data-listening", "false");
});

function stubStorage(initial: Record<string, string> = {}): Map<string, string> {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
  return store;
}

test("MV-UI9 자동 재생 끄기 — 위 띠의 스피커 토글, 기기에 기억하고 재생을 멈춘다", async () => {
  const store = stubStorage();
  const voice = voicePorts();
  mount(talking, voice);
  await settle();
  expect(voice.device.played).toHaveLength(1);
  const toggle = id("roleplay-mission-auto-play");
  expect(toggle).toHaveAttribute("data-on", "true");
  expect(within(toggle).getByTestId("ui-lynx-round-button")).toHaveAttribute(
    "accessibility-label",
    "Auto-play, on",
  );
  const stopsBefore = voice.device.stops();
  tapRound("roleplay-mission-auto-play");
  expect(id("roleplay-mission-auto-play")).toHaveAttribute("data-on", "false");
  expect(store.get("libitum.roleplay-mission.autoplay")).toBe("off");
  expect(voice.device.stops()).toBeGreaterThan(stopsBefore);
});

test("MV-UI10 꺼 둔 설정이면 새 말을 자동 재생하지 않고, 다시 듣기는 된다", async () => {
  stubStorage({ "libitum.roleplay-mission.autoplay": "off" });
  const voice = voicePorts();
  mount(talking, voice);
  await settle();
  expect(voice.device.played).toEqual([]);
  expect(id("roleplay-mission-auto-play")).toHaveAttribute("data-on", "false");
  const opening = MISSION_FIXTURE_IDS.opening;
  fireEvent.tap(id(`roleplay-mission-replay-${opening}`), {});
  await settle();
  expect(voice.device.played).toEqual([`fake://tts/${opening}`]);
});
