import { describe, expect, test } from "vitest";

import { catalogTitleLines } from "./catalog-title";

// `unit` 계층: 머리 카드 제목 줄 나눔 — 띄어쓰기에서만 끊고, 최대 두 줄, 두 줄 길이 차가 가장 작은 자리,
// 넘치면 작은 글자 단계. 한 줄 글자 수는 카드 폭(151px)에서 잡은 값이며 호출 쪽이 정합니다.

const MAX = 8;

const convenience = "익선동 골목 어귀 편의점";
const frontDesk = "익선 게스트하우스 프런트";
const dormitory = "익선 게스트하우스 여성 도미토리";
const longNoSpace = "가나다라마바사아자차카타파하";
const short = "편의점";

const length = (text: string) => Array.from(text).length;

describe("catalogTitleLines", () => {
  test.each([convenience, frontDesk, dormitory, longNoSpace, short])(
    "CT1. %s — 줄을 띄어쓰기로 이으면 원래 제목이고 낱말이 쪼개지지 않는다",
    (title) => {
      const { lines } = catalogTitleLines(title, MAX);

      expect(lines.join(" ")).toBe(title);
      expect(lines.flatMap((line) => line.split(" "))).toEqual(title.split(" "));
      for (const line of lines) {
        expect(line.trim()).toBe(line);
        expect(line.length).toBeGreaterThan(0);
      }
    },
  );

  test.each([convenience, frontDesk, dormitory, longNoSpace, short])(
    "CT2. %s — 줄은 한두 개다",
    (title) => {
      const { lines } = catalogTitleLines(title, MAX);

      expect(lines.length).toBeGreaterThanOrEqual(1);
      expect(lines.length).toBeLessThanOrEqual(2);
    },
  );

  test("CT3. 편의점 제목은 6자 · 6자로 나뉘고 기본 크기다", () => {
    expect(catalogTitleLines(convenience, MAX)).toEqual({
      lines: ["익선동 골목", "어귀 편의점"],
      size: "default",
    });
  });

  test("CT4. 프런트 제목은 두 줄 길이 차가 가장 작은 자리에서 끊기고 한 줄이 넘쳐 compact다", () => {
    expect(catalogTitleLines(frontDesk, MAX)).toEqual({
      lines: ["익선 게스트하우스", "프런트"],
      size: "compact",
    });
  });

  test("CT5. 도미토리 제목은 9자 · 7자로 나뉘고 compact다", () => {
    expect(catalogTitleLines(dormitory, MAX)).toEqual({
      lines: ["익선 게스트하우스", "여성 도미토리"],
      size: "compact",
    });
  });

  test("CT6. 띄어쓰기 없는 긴 제목은 한 줄 그대로이고 compact다", () => {
    expect(catalogTitleLines(longNoSpace, MAX)).toEqual({
      lines: [longNoSpace],
      size: "compact",
    });
  });

  test("CT7. 짧은 한 낱말 제목은 한 줄 그대로이고 기본 크기다", () => {
    expect(catalogTitleLines(short, MAX)).toEqual({ lines: [short], size: "default" });
  });

  test("CT8. 두 줄이 되는 제목은 가능한 모든 띄어쓰기 자리 중 길이 차가 최소인 자리를 쓴다", () => {
    for (const title of [convenience, frontDesk, dormitory]) {
      const words = title.split(" ");
      const diffs: number[] = [];
      for (let cut = 1; cut < words.length; cut += 1) {
        diffs.push(
          Math.abs(length(words.slice(0, cut).join(" ")) - length(words.slice(cut).join(" "))),
        );
      }
      const { lines } = catalogTitleLines(title, MAX);

      expect(lines).toHaveLength(2);
      expect(Math.abs(length(lines[0] as string) - length(lines[1] as string))).toBe(
        Math.min(...diffs),
      );
    }
  });

  test("CT9. 크기는 어느 줄이 한 줄 한도를 넘을 때만 compact다", () => {
    for (const title of [convenience, frontDesk, dormitory, longNoSpace, short]) {
      const { lines, size } = catalogTitleLines(title, MAX);
      const overflow = lines.some((line) => length(line) > MAX);

      expect(size).toBe(overflow ? "compact" : "default");
    }
  });

  test("CT10. 한 줄 한도를 넓히면 같은 제목이 기본 크기로 돌아온다", () => {
    expect(catalogTitleLines(dormitory, 12).size).toBe("default");
    expect(catalogTitleLines(frontDesk, 12).size).toBe("default");
  });
});
