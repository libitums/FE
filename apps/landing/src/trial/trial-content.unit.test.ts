import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { u00Translations } from "./content/u00-translations";
import { loadTrialModel, trialGlossLangOf, TRIAL_CONTENT } from "./trial-content";
import { trialImageUrlOf } from "./trial-images";
import { TEST_CONTENT_BASE, TRIAL_COPY_PATH } from "./trial.test-support";

// `unit` 계층: 사본의 고정값(판 · 길이 · sha256)과 빌드 때 모델을 만드는 진입.

describe("TRIAL_CONTENT", () => {
  it("TC1 사본의 바이트 길이 · sha256이 핀과 같고 판은 2026-10-23.1", () => {
    expect(existsSync(TRIAL_COPY_PATH), "사본이 없다").toBe(true);
    const bytes = readFileSync(TRIAL_COPY_PATH);
    expect(TRIAL_CONTENT.episodeId).toBe("u00-tutorial");
    expect(TRIAL_CONTENT.version).toBe("2026-10-23.1");
    expect(bytes.byteLength).toBe(TRIAL_CONTENT.bytes);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(TRIAL_CONTENT.sha256);
    expect(TRIAL_CONTENT.bytes).toBe(37847);
    expect(TRIAL_CONTENT.sha256).toBe(
      "42134653f72075a0d728635899e66be0c460ebb75bfb5ffa794e53ae6719eb2a",
    );
  });
});

describe("loadTrialModel", () => {
  it("TM8 사본으로 모델을 만들고 판 · 에피소드 id를 싣는다", () => {
    const model = loadTrialModel({ imageUrlOf: trialImageUrlOf, contentBase: TEST_CONTENT_BASE });
    expect(model.episodeId).toBe("u00-tutorial");
    expect(model.version).toBe(TRIAL_CONTENT.version);
  });

  it("TM9 페이지 언어에 번역표가 있으면(vi · id · ms) 영어 칸을 바꾸고, en · ko는 영어 그대로", () => {
    const port = { imageUrlOf: trialImageUrlOf, contentBase: TEST_CONTENT_BASE };
    const en = loadTrialModel(port);
    expect(loadTrialModel(port, "ko")).toEqual(en);
    for (const language of ["vi", "id", "ms"] as const) {
      const model = loadTrialModel(port, language);
      expect(model.imageMatch.instruction).toBe(
        u00Translations[language][en.imageMatch.instruction],
      );
      expect(model.prologue[0].text.en).toBe(
        u00Translations[language][en.prologue[0].text.en ?? ""],
      );
      expect(model.prologue[0].text.ko).toBe(en.prologue[0].text.ko);
    }
  });

  it("TM10 뜻풀이의 lang — 번역표가 있는 언어는 그 언어, 아니면 en", () => {
    expect(trialGlossLangOf("en")).toBe("en");
    expect(trialGlossLangOf("ko")).toBe("en");
    expect(trialGlossLangOf("vi")).toBe("vi");
    expect(trialGlossLangOf("id")).toBe("id");
    expect(trialGlossLangOf("ms")).toBe("ms");
    expect(trialGlossLangOf("ja")).toBe("en");
  });

  it("TM8 모델을 만들 수 없으면 던지고 메시지에 오류 코드 · 경로가 있다", () => {
    // 그림 표가 비면 IMG_MATCH 그림을 찾지 못해 item-malformed
    const load = () => loadTrialModel({ imageUrlOf: () => null, contentBase: TEST_CONTENT_BASE });
    expect(load).toThrow(/item-malformed/);
    expect(load).toThrow(/S3/);
  });
});
