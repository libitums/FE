import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { getEpisodeHeaderContract } from "./episode-header.contract";

const base = { episodeLabel: "Episode 0.", title: "Tutorial.", totalUnitCount: 20 } as const;

describe("getEpisodeHeaderContract", () => {
  test("번호 · 이름 · 개수 라벨을 그대로 낸다", () => {
    expect(getEpisodeHeaderContract({ ...base, completedUnitCount: 7 })).toMatchObject({
      episodeLabel: "Episode 0.",
      title: "Tutorial.",
      countLabel: "7 / 20",
    });
  });

  test("앞뒤 공백을 다듬는다", () => {
    expect(
      getEpisodeHeaderContract({
        episodeLabel: "  Episode 1. ",
        title: " Cosmetic. ",
        totalUnitCount: 3,
        completedUnitCount: 1,
      }),
    ).toMatchObject({ episodeLabel: "Episode 1.", title: "Cosmetic." });
  });

  // 채움 폭은 끝낸 수 ÷ 전체입니다. 양끝을 함께 답니다 — 0%는 채움을 그리지 않는
  // 분기의 입력이고, 100%는 막대가 가득 차는 자리입니다.
  test.each([
    [0, 20, 0],
    [7, 20, 35],
    [10, 20, 50],
    [20, 20, 100],
    [1, 3, (1 / 3) * 100],
  ])("끝낸 %s / 전체 %s면 채움이 %s%%다", (completed, total, percent) => {
    expect(
      getEpisodeHeaderContract({ ...base, totalUnitCount: total, completedUnitCount: completed })
        .fillPercent,
    ).toBeCloseTo(percent);
  });

  // 「7 / 20」은 눈으로 보면 막대 옆이라 뜻이 붙지만, 낭독되면 무엇의 7인지 알 수
  // 없습니다. 이름이 단위를 밝히는지 답니다.
  test("접근성 이름이 번호 · 이름과 함께 단위를 밝힌다", () => {
    expect(getEpisodeHeaderContract({ ...base, completedUnitCount: 7 })).toMatchObject({
      accessibilityLabel: "Episode 0. Tutorial., 유닛 20개 중 7개 완료",
    });
  });

  test("빈 번호 · 빈 이름을 거부한다", () => {
    expect(() =>
      getEpisodeHeaderContract({ ...base, episodeLabel: " ", completedUnitCount: 0 }),
    ).toThrow("episodeLabel must not be empty");
    expect(() => getEpisodeHeaderContract({ ...base, title: " ", completedUnitCount: 0 })).toThrow(
      "title must not be empty",
    );
  });

  // 전체가 0이면 나눗셈이 NaN이 되고 막대가 조용히 사라집니다 — 진행이 아니라 데이터
  // 오류이므로 던집니다.
  test("전체 유닛 수가 0이거나 정수가 아니면 던진다", () => {
    expect(() =>
      getEpisodeHeaderContract({ ...base, totalUnitCount: 0, completedUnitCount: 0 }),
    ).toThrow("totalUnitCount must be a positive integer");
    expect(() =>
      getEpisodeHeaderContract({ ...base, totalUnitCount: 2.5, completedUnitCount: 0 }),
    ).toThrow("totalUnitCount must be a positive integer");
  });

  // 끝낸 수가 전체를 넘는 것은 계산 오류입니다. 100%로 눌러 감추면 그 오류가 화면에서
  // 사라지므로 던집니다.
  test("끝낸 수가 음수이거나 전체를 넘으면 던진다", () => {
    expect(() => getEpisodeHeaderContract({ ...base, completedUnitCount: -1 })).toThrow(
      "completedUnitCount must be a non-negative integer",
    );
    expect(() => getEpisodeHeaderContract({ ...base, completedUnitCount: 21 })).toThrow(
      "completedUnitCount must not exceed totalUnitCount",
    );
  });
});

describe("episode-header.css", () => {
  const styles = readFileSync(
    resolve(process.cwd(), "src/episode-header/episode-header.css"),
    "utf8",
  );

  test("카드의 정본 token을 고정한다", () => {
    expect(styles).toMatch(
      /\.ui-lynx-episode-header\s*\{[^}]*border:\s*var\(--libitum-stroke-width-thin\) solid var\(--libitum-color-border-disabled\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-episode-header\s*\{[^}]*border-radius:\s*var\(--libitum-radius-xl\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-episode-header\s*\{[^}]*background:\s*var\(--libitum-color-white\)/,
    );
  });

  // 이름은 accent/chapter입니다 — 이 토큰이 Futura 뒤에 한글 폴백을 달고 있어 한글
  // 이름도 그려집니다. 다른 타이포로 바꾸면 디자인의 글자 모양이 사라집니다.
  test("이름이 accent chapter 타이포와 브랜드색을 쓴다", () => {
    expect(styles).toMatch(
      /\.ui-lynx-episode-header-title\s*\{[^}]*color:\s*var\(--libitum-color-brand-primary\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-episode-header-title\s*\{[^}]*font-family:\s*var\(--libitum-typography-accent-chapter-font-family\)/,
    );
  });

  test("진행 막대의 트랙과 채움 색이 갈린다", () => {
    expect(styles).toMatch(
      /\.ui-lynx-episode-header-track\s*\{[^}]*background:\s*var\(--libitum-color-gray-200\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-episode-header-fill\s*\{[^}]*background:\s*var\(--libitum-color-feedback-warning\)/,
    );
  });

  // 채움이 넘치면 별이 트랙 밖으로 빠져나옵니다.
  test("채움이 별을 막대 안에 가둔다", () => {
    expect(styles).toMatch(/\.ui-lynx-episode-header-fill\s*\{[^}]*overflow:\s*hidden/);
  });
});
