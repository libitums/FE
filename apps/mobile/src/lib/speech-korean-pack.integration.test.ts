import { afterEach, expect, test, vi } from "vitest";

import {
  downloadSpeechKoreanPack,
  getSpeechKoreanPack,
  koreanPackOfferOf,
  koreanPackProgressEvent,
  subscribeKoreanPackProgress,
} from "./speech-korean-pack";
import type { KoreanPackDownloadResult } from "./speech-korean-pack";
import type { SpeechKoreanPack } from "./speech-recognition-types";

// `integration` 계층: 한국어 팩 접점이 전역 `NativeModules`(호스트 경계)와 전역 이벤트를 어떻게 건너는지 봅니다.
// 호스트 모양은 Android `SpeechRecognitionModule`의 `getKoreanPack` · `downloadKoreanPack` 페이로드 그대로입니다.

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubHost(methods: Record<string, unknown>): void {
  vi.stubGlobal("NativeModules", { SpeechRecognitionModule: { stop: () => {}, ...methods } });
}

test("KPI1. Android 호스트의 팩 상태가 그대로 오고, available이면 내려받기를 권한다", () => {
  stubHost({
    getKoreanPack: (callback: (payload: unknown) => void) => callback({ koreanPack: "available" }),
  });
  const packs: SpeechKoreanPack[] = [];

  expect(getSpeechKoreanPack((pack) => packs.push(pack))).toBe("requested");
  expect(packs).toEqual(["available"]);
  expect(koreanPackOfferOf(packs[0] ?? "unknown")).toBe("offer");
});

test("KPI2. 메서드가 없는 호스트(iOS · 옛 Android)와 접점 없음은 unavailable이고 콜백이 오지 않는다", () => {
  const onPack = vi.fn<(pack: SpeechKoreanPack) => void>();
  const onResult = vi.fn<(result: KoreanPackDownloadResult) => void>();

  stubHost({});
  expect(getSpeechKoreanPack(onPack)).toBe("unavailable");
  expect(downloadSpeechKoreanPack(onResult)).toBe("unavailable");

  vi.stubGlobal("NativeModules", {});
  expect(getSpeechKoreanPack(onPack)).toBe("unavailable");
  expect(downloadSpeechKoreanPack(onResult)).toBe("unavailable");

  expect(onPack).not.toHaveBeenCalled();
  expect(onResult).not.toHaveBeenCalled();
});

test("KPI3. 내려받기 결말이 한 번 오고, 진행률은 전역 이벤트로 오며 구독을 풀면 그친다", () => {
  const listeners = new Map<string, (...args: unknown[]) => void>();
  vi.stubGlobal("lynx", {
    getJSModule: () => ({
      addListener: (name: string, listener: (...args: unknown[]) => void) =>
        listeners.set(name, listener),
      removeListener: (name: string) => listeners.delete(name),
    }),
  });
  stubHost({
    downloadKoreanPack: (callback: (payload: unknown) => void) => {
      listeners.get(koreanPackProgressEvent)?.(40);
      listeners.get(koreanPackProgressEvent)?.(140);
      callback({ status: "completed", errorCode: 0 });
    },
  });
  const progress: number[] = [];
  const results: KoreanPackDownloadResult[] = [];

  const unsubscribe = subscribeKoreanPackProgress((percent) => progress.push(percent));
  expect(downloadSpeechKoreanPack((result) => results.push(result))).toBe("requested");
  unsubscribe();

  expect(progress).toEqual([40, 100]);
  expect(results).toEqual([{ status: "completed", errorCode: 0 }]);
  expect(listeners.has(koreanPackProgressEvent)).toBe(false);
});
