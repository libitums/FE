import { afterEach, describe, expect, it, vi } from "vitest";

import { onAudioStarted, pauseAudio, playAudio, stopAudio } from "./audio";

// `unit` 계층: 새 재생 알림(`onAudioStarted`, ADR-0164 앱 추가 2026-11-20). 프로필 시트 목소리 견본이 다른 소리에 밀려났음을 아는
// 길입니다 — 호스트에 재생을 넘길 때만 부르고, 멈춤 · 일시정지 · 모듈 없음에서는 부르지 않습니다. 대역 형태는 ./audio.unit.test.ts.

function stubHost(): void {
  vi.stubGlobal("NativeModules", {
    AudioPlaybackModule: { play: () => {}, stop: () => {}, pause: () => {}, resume: () => {} },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("onAudioStarted", () => {
  it("재생을 넘길 때마다 한 번씩 부른다", () => {
    stubHost();
    const heard = vi.fn();
    const off = onAudioStarted(heard);
    playAudio("https://a/1.mp3", () => {});
    playAudio("https://a/2.mp3", () => {});
    expect(heard).toHaveBeenCalledTimes(2);
    off();
  });

  it("멈춤 · 일시정지는 새 재생이 아니다", () => {
    stubHost();
    const heard = vi.fn();
    const off = onAudioStarted(heard);
    stopAudio();
    pauseAudio();
    expect(heard).not.toHaveBeenCalled();
    off();
  });

  it("모듈이 없으면 부르지 않는다(unavailable)", () => {
    const heard = vi.fn();
    const off = onAudioStarted(heard);
    expect(playAudio("https://a/1.mp3", () => {})).toBe("unavailable");
    expect(heard).not.toHaveBeenCalled();
    off();
  });

  it("끊은 뒤에는 부르지 않는다", () => {
    stubHost();
    const heard = vi.fn();
    onAudioStarted(heard)();
    playAudio("https://a/1.mp3", () => {});
    expect(heard).not.toHaveBeenCalled();
  });
});
