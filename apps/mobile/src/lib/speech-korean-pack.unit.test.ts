import { describe, expect, test } from "vitest";

import { koreanPackDownloadResult, koreanPackOfferOf, speechKoreanPack } from "./speech-korean-pack";
import type { SpeechKoreanPack } from "./speech-recognition-types";

// `unit` 계층: 한국어 팩 상태 · 내려받기 결말 페이로드 파서와 「내려받기를 권할지」 판정의 입출력만 봅니다.
// 접점 함수(전역 `NativeModules`를 읽음)는 integration 계층이 봅니다.

describe("speechKoreanPack", () => {
  test("KP1. 아는 낱말은 그대로, 그 밖은 unknown이다", () => {
    for (const pack of ["installed", "downloading", "available", "unsupported", "unknown"]) {
      expect(speechKoreanPack(pack)).toBe(pack);
    }
    expect(speechKoreanPack("ready")).toBe("unknown");
    expect(speechKoreanPack(undefined)).toBe("unknown");
    expect(speechKoreanPack(null)).toBe("unknown");
    expect(speechKoreanPack(1)).toBe("unknown");
  });
});

describe("koreanPackDownloadResult", () => {
  test("KP2. 결말과 오류 코드가 그대로 올라온다", () => {
    expect(koreanPackDownloadResult({ status: "completed", errorCode: 0 })).toEqual({
      status: "completed",
      errorCode: 0,
    });
    expect(koreanPackDownloadResult({ status: "failed", errorCode: 13 })).toEqual({
      status: "failed",
      errorCode: 13,
    });
    for (const status of ["scheduled", "requested", "unsupported"]) {
      expect(koreanPackDownloadResult({ status }).status).toBe(status);
    }
  });

  test("KP3. 어그러진 페이로드는 던지지 않고 failed · 0이다", () => {
    expect(koreanPackDownloadResult(null)).toEqual({ status: "failed", errorCode: 0 });
    expect(koreanPackDownloadResult({ status: "done", errorCode: Number.NaN })).toEqual({
      status: "failed",
      errorCode: 0,
    });
  });
});

describe("koreanPackOfferOf — 동의 화면의 이음매", () => {
  const table: readonly (readonly [SpeechKoreanPack, "offer" | "none"])[] = [
    ["available", "offer"],
    ["installed", "none"],
    ["downloading", "none"],
    ["unsupported", "none"],
    ["unknown", "none"],
  ];

  test.each(table)("KP4. %s → %s", (pack, expected) => {
    expect(koreanPackOfferOf(pack)).toBe(expected);
  });
});
