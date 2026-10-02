import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { PrologueCallScreen } from "./PrologueCallScreen";
import { PhoneCallScreen } from "../phone-call/PhoneCallScreen";
import { getPhoneCallConversation } from "../phone-call/phone-call";

afterEach(() => vi.unstubAllGlobals());

function stubAudio() {
  const calls: string[] = [];
  vi.stubGlobal("NativeModules", {
    SoundEffectsModule: {
      play: (id: string) => calls.push(`effect:${id}`),
      stopRing: () => calls.push("stop-ring"),
    },
    AudioPlaybackModule: {
      play: (id: string, _done: (result: unknown) => void) => calls.push(`voice:${id}`),
      stop: () => calls.push("stop-voice"),
      pause: () => {},
      resume: () => {},
    },
  });
  return calls;
}

test("서사 전화는 벨을 울리고 받으면 벨을 멈춘 뒤 수락음과 대사를 재생한다", () => {
  const calls = stubAudio();
  render(
    <PrologueCallScreen
      insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
      episodeLabel="Before We Land"
      callerPortrait={null}
      call={{
        callerName: "Minseo",
        lines: [{ text: "안녕", translation: "Hi", audioSource: "first" }],
      }}
      onComplete={() => {}}
      onBack={() => {}}
    />,
  );
  expect(calls).toContain("effect:ring_bell");
  expect(calls).not.toContain("voice:first");

  fireEvent.tap(screen.getByTestId("prologue-call-screen-accept"), {});
  expect(calls).toContain("effect:accept_call");
  expect(calls).toContain("voice:first");
  expect(calls.indexOf("stop-ring")).toBeLessThan(calls.indexOf("voice:first"));
});

test("서사 수신 화면을 떠나면 벨을 멈춘다", () => {
  const calls = stubAudio();
  const view = render(
    <PrologueCallScreen
      insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
      episodeLabel="Before We Land"
      callerPortrait={null}
      call={{ callerName: "Minseo", lines: [{ text: "안녕", translation: "Hi" }] }}
      onComplete={() => {}}
      onBack={() => {}}
    />,
  );
  expect(calls).toContain("effect:ring_bell");
  view.unmount();
  expect(calls).toContain("stop-ring");
});

const conversation = getPhoneCallConversation();

test("전화 유닛은 받기에서 벨을 멈추고 음성을 기존 재생 경로로 보낸다", () => {
  const calls = stubAudio();
  render(
    <PhoneCallScreen
      unitId={conversation.unitId}
      conversation={conversation}
      completionStatus="available"
      onComplete={() => {}}
      onExit={() => {}}
    />,
  );
  expect(calls).toContain("effect:ring_bell");
  fireEvent.tap(screen.getByTestId("phone-call-audio-button"), {});
  expect(calls).toContain("effect:accept_call");
  expect(calls.indexOf("stop-ring")).toBeLessThan(calls.indexOf("voice:phone-call-confirm-01"));
});
