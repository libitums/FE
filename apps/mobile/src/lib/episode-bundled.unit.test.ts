import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { bundledCatalogInput } from "./episode-bundled";
import { sha256Hex, utf8Bytes } from "./sha256";

// `unit` 계층: 내장 데이터 모듈의 값만 봅니다(디스크 원문과 대조).

const IDS = ["u00-tutorial", "u01-water", "u02-checkin", "u03-mina"];

describe("bundledCatalogInput", () => {
  test("B1. 내장 매니페스트 항목은 넷이고 해시가 디스크 원문과 같으며 본문 키가 맞다", () => {
    const { manifest, episodes } = bundledCatalogInput;
    expect(manifest.episodes).toHaveLength(4);
    expect(manifest.episodes.map((e) => e.id)).toEqual(IDS);
    for (const e of manifest.episodes) {
      const text = readFileSync(resolve(process.cwd(), `content/episodes/${e.id}.json`), "utf8");
      expect(e.sha256).toBe(sha256Hex(utf8Bytes(text)));
      expect(e.bytes).toBe(utf8Bytes(text).length);
    }
    expect(Object.keys(episodes).sort()).toEqual([...IDS].sort());
  });

  test("BD5. 내장 매니페스트 version이 u00 · u01~u03 모두 2026-10-23.1이다", () => {
    const versions = Object.fromEntries(
      bundledCatalogInput.manifest.episodes.map((e) => [e.id, e.version]),
    );
    expect(versions).toEqual({
      "u00-tutorial": "2026-10-23.1",
      "u01-water": "2026-10-23.1",
      "u02-checkin": "2026-10-23.1",
      "u03-mina": "2026-10-23.1",
    });
  });
});
