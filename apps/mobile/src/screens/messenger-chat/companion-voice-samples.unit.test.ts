import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { COMPANION_ROSTER } from "./companion-roster";
import { VOICE_SAMPLE_SCRIPTS, voiceSampleOf } from "./companion-voice-samples";

// `unit` 계층(VS1 ~ VS3): 앱 견본 표가 정본 `docs/content/companion-voice-intros.json`과 같고(ADR-0198 D1), 인물 아홉 모두 칸에
// 경로 · 대본이 얹히며, 여덟 화면 언어 뜻이 비지 않는다(D3).

const LANGUAGES = ["en", "es", "id", "ja", "vi", "th", "my", "zh-TW"] as const;

type SourceCharacter = {
  readonly id: string;
  readonly audio: { readonly path: string };
  readonly script: Readonly<Record<string, string>>;
};

const source = JSON.parse(
  readFileSync(resolve(process.cwd(), "../../docs/content/companion-voice-intros.json"), "utf8"),
) as { readonly characters: readonly SourceCharacter[] };

describe("VS1 정본과 앱 표가 같다", () => {
  test("인물 아홉 — id 집합", () => {
    expect(Object.keys(VOICE_SAMPLE_SCRIPTS).sort()).toEqual(
      source.characters.map((c) => c.id).sort(),
    );
    expect(source.characters).toHaveLength(9);
  });

  test.each(source.characters.map((c) => [c.id, c] as const))(
    "%s — 경로 · 한글 · 로마자 · 여덟 언어 뜻",
    (id, character) => {
      const sample = voiceSampleOf(id);
      expect(sample.voiceSamplePath).toBe(character.audio.path);
      expect(sample.voiceSampleScript).toEqual(character.script);
    },
  );
});

describe("VS2 인물 칸에 얹힌다", () => {
  test("이야기 다섯 · 추천 친구 넷 모두 경로와 대본이 있다", () => {
    expect(COMPANION_ROSTER).toHaveLength(9);
    for (const character of COMPANION_ROSTER) {
      expect(character.voiceSamplePath, character.id).toBe(
        `content/audio/companion/${character.id}-intro.mp3`,
      );
      expect(character.voiceSampleScript, character.id).toEqual(VOICE_SAMPLE_SCRIPTS[character.id]);
    }
  });

  test("표에 없는 인물은 둘 다 null", () => {
    expect(voiceSampleOf("clerk")).toEqual({ voiceSamplePath: null, voiceSampleScript: null });
  });
});

test("VS3 여덟 언어 뜻 · 한글 · 로마자가 비지 않는다", () => {
  for (const [id, script] of Object.entries(VOICE_SAMPLE_SCRIPTS)) {
    expect(script.ko.trim(), id).not.toBe("");
    expect(script.roman.trim(), id).not.toBe("");
    for (const language of LANGUAGES) {
      expect((script[language] ?? "").trim(), `${id} ${language}`).not.toBe("");
    }
  }
});
