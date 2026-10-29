import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { languages } from "../site";
import { storyEpisodes } from "./episodes";

const landingRoot = path.resolve(__dirname, "../..");
const sha = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");
/** vitest에서 그림 import의 `src`는 `/src/assets/…` 또는 `/@fs/<절대 경로>` 꼴입니다. 둘 다 파일 경로로 돌립니다. */
const fileOf = (src: string) => {
  const clean = src.split("?")[0] ?? src;
  if (clean.startsWith("/@fs/")) return clean.slice("/@fs".length);
  const at = clean.indexOf("/src/assets/");
  return path.join(landingRoot, clean.slice(at));
};

describe("storyEpisodes — Story 줄 데이터", () => {
  it("ST-1 id는 앱 unit id 꼴이고 겹치지 않는다", () => {
    const ids = storyEpisodes.map((episode) => episode.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^u\d{2}-[a-z-]+$/);
  });

  it("ST-2 새 것이 먼저다 — 번호가 내려가고 맨 앞이 가장 크다", () => {
    const numbers = storyEpisodes.map((episode) => episode.number);
    for (let i = 1; i < numbers.length; i += 1) {
      expect(numbers[i]).toBeLessThan(numbers[i - 1] as number);
    }
    expect(numbers[0]).toBe(Math.max(...numbers));
    for (const episode of storyEpisodes) {
      expect(episode.id.startsWith(`u${String(episode.number).padStart(2, "0")}-`)).toBe(true);
    }
  });

  it("ST-3 모든 언어의 제목 · 때 · 티저 · 대체 문구가 비어 있지 않다", () => {
    for (const episode of storyEpisodes) {
      for (const language of languages) {
        expect(episode.title[language].trim()).not.toBe("");
        expect(episode.when[language].trim()).not.toBe("");
        expect(episode.teaser[language].trim()).not.toBe("");
        expect(episode.alt[language].trim()).not.toBe("");
      }
    }
  });

  it("ST-4 그림은 버킷 사본이고 세로(9:16)다", () => {
    for (const episode of storyEpisodes) {
      expect(episode.image.src).toContain(`/content/images/${episode.id}/`);
      expect(episode.image.height).toBeGreaterThan(episode.image.width);
    }
  });

  it("ST-5 체험판 그림과 바이트가 같은 컷은 쓰지 않는다 — 빌드가 둘을 한 파일로 합치고 원본을 지워 체험판이 404를 낸다", () => {
    const trialDir = path.join(landingRoot, "src/assets/trial/images");
    const trial = new Map<string, string>();
    for (const entry of readdirSync(trialDir, { withFileTypes: true, recursive: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".webp")) continue;
      const file = path.join(entry.parentPath ?? entry.path, entry.name);
      trial.set(sha(file), path.relative(trialDir, file));
    }
    expect(trial.size).toBeGreaterThan(0);
    for (const episode of storyEpisodes) {
      const twin = trial.get(sha(fileOf(episode.image.src)));
      expect(twin, `${episode.id}의 그림이 체험판 ${twin ?? ""}과 같은 바이트`).toBeUndefined();
    }
  });
});
