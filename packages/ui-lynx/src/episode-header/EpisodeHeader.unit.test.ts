import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { getEpisodeHeaderContract } from "./episode-header.contract";

// 설명 줄은 호출자가 「Episode 0, unit 03」처럼 만들어 넘깁니다(spec §19 H-1).
const base = {
  episodeLabel: "Episode 0, unit 03",
  title: "Tutorial.",
  totalUnitCount: 20,
} as const;

describe("getEpisodeHeaderContract", () => {
  test("번호 · 이름 · 개수 라벨을 그대로 낸다", () => {
    expect(getEpisodeHeaderContract({ ...base, completedUnitCount: 7 })).toMatchObject({
      episodeLabel: "Episode 0, unit 03",
      title: "Tutorial.",
      countLabel: "7 / 20",
    });
  });

  test("앞뒤 공백을 다듬는다", () => {
    expect(
      getEpisodeHeaderContract({
        episodeLabel: "  Episode 1, unit 00 ",
        title: " Cosmetic. ",
        totalUnitCount: 3,
        completedUnitCount: 1,
      }),
    ).toMatchObject({ episodeLabel: "Episode 1, unit 00", title: "Cosmetic." });
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
  test("단위가 하나면 단수로 낭독한다", () => {
    expect(
      getEpisodeHeaderContract({ ...base, totalUnitCount: 1, completedUnitCount: 1 }),
    ).toMatchObject({
      accessibilityLabel: "Episode 0, unit 03, Tutorial., 1 of 1 unit completed",
    });
  });

  test("접근성 이름이 번호 · 이름과 함께 단위를 밝힌다", () => {
    expect(getEpisodeHeaderContract({ ...base, completedUnitCount: 7 })).toMatchObject({
      accessibilityLabel: "Episode 0, unit 03, Tutorial., 7 of 20 units completed",
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

  const block = (selector: string): string => {
    const match = new RegExp(`${selector.replace(/\./g, "\\.")}\\s*\\{([^}]*)\\}`).exec(styles);
    return match?.[1] ?? "";
  };

  // spec §19 H-1: 면은 브랜드 주황, 테두리 없음, 왼쪽 정렬, 폭은 부모가 정한다.
  test("HC1. 띠는 brand-primary 면에 테두리가 없고 radius-xl이다", () => {
    const card = block(".ui-lynx-episode-header");
    expect(card).toMatch(/background:\s*var\(--libitum-color-brand-primary\)/);
    expect(card).toMatch(/border-radius:\s*var\(--libitum-radius-xl\)/);
    expect(card).not.toMatch(/(^|[\s;])border:/);
    expect(card).not.toMatch(/background:\s*var\(--libitum-color-white\)/);
  });

  test("HC2. 안쪽 여백은 위 16 · 좌우 20 · 아래 16이고 왼쪽 정렬이다", () => {
    const card = block(".ui-lynx-episode-header");
    expect(card).toMatch(
      /padding:\s*var\(--libitum-spacing-16\)\s+var\(--libitum-spacing-20\)\s+var\(--libitum-spacing-16\)/,
    );
    expect(card).toMatch(/align-items:\s*flex-start/);
  });

  test("HC3. 카드가 폭을 고정하지 않는다 (px 폭 없음)", () => {
    expect(block(".ui-lynx-episode-header")).not.toMatch(/(^|[\s;])width:\s*\d+px/);
  });

  test("HC4. 설명 줄 · 숫자는 흰색이고 body-s 타이포다", () => {
    const label = block(".ui-lynx-episode-header-label");
    expect(label).toMatch(/color:\s*var\(--libitum-color-white\)/);
    expect(label).toMatch(/font-size:\s*var\(--libitum-typography-body-s-font-size\)/);
    expect(block(".ui-lynx-episode-header-count")).toMatch(/color:\s*var\(--libitum-color-white\)/);
  });

  // 이름은 accent/chapter입니다 — 이 토큰이 Jost 뒤에 한글 폴백을 달고 있어 한글
  // 이름도 그려집니다. 다른 타이포로 바꾸면 디자인의 글자 모양이 사라집니다.
  test("HC5. 이름이 accent chapter 타이포와 흰색을 쓴다", () => {
    const title = block(".ui-lynx-episode-header-title");
    expect(title).toMatch(/color:\s*var\(--libitum-color-white\)/);
    expect(title).toMatch(/font-family:\s*var\(--libitum-typography-accent-chapter-font-family\)/);
    expect(title).not.toMatch(/color:\s*var\(--libitum-color-brand-primary\)/);
  });

  test("HC6. 진행 막대의 트랙은 reward-border, 채움은 흰색으로 갈린다", () => {
    expect(block(".ui-lynx-episode-header-track")).toMatch(
      /background:\s*var\(--libitum-color-brand-reward-border\)/,
    );
    expect(block(".ui-lynx-episode-header-fill")).toMatch(
      /background:\s*var\(--libitum-color-white\)/,
    );
  });

  test("HC7. 트랙은 남는 폭을 채운다 (flex: 1, 높이 10)", () => {
    const track = block(".ui-lynx-episode-header-track");
    expect(track).toMatch(/flex:\s*1/);
    expect(track).toMatch(/height:\s*10px/);
  });

  test("HC8. 진행 줄은 왼쪽 정렬이다", () => {
    expect(block(".ui-lynx-episode-header-progress")).not.toMatch(/justify-content:\s*center/);
  });

  test("HC9. 별 스타일이 없다", () => {
    expect(styles).not.toContain("ui-lynx-episode-header-star");
  });

  // 채움이 넘치면 별이 트랙 밖으로 빠져나옵니다.
  test("채움이 별을 막대 안에 가둔다", () => {
    expect(styles).toMatch(/\.ui-lynx-episode-header-fill\s*\{[^}]*overflow:\s*hidden/);
  });
});

describe("progressEntrance", () => {
  const props = { ...base, completedUnitCount: 7 } as const;

  test("EH1-a. 없으면 none, fill · none은 그대로, 잘못된 값은 던지지 않고 none이다", () => {
    expect(getEpisodeHeaderContract(props).progressEntrance).toBe("none");
    expect(getEpisodeHeaderContract({ ...props, progressEntrance: "fill" }).progressEntrance).toBe(
      "fill",
    );
    expect(getEpisodeHeaderContract({ ...props, progressEntrance: "none" }).progressEntrance).toBe(
      "none",
    );
    const bogus = getEpisodeHeaderContract({ ...props, progressEntrance: "bogus" as never });
    expect(bogus.progressEntrance).toBe("none");
  });

  test("EH1-b. 기존 필드는 progressEntrance와 무관하게 같다", () => {
    const plain = getEpisodeHeaderContract(props);
    const filled = getEpisodeHeaderContract({ ...props, progressEntrance: "fill" });
    // 가드: 값이 실제로 파생되어야 이 비교가 뜻이 있다.
    expect(filled.progressEntrance).toBe("fill");
    expect({ ...filled, progressEntrance: "none" }).toEqual(plain);
  });
});

describe("episode-header.css 등장 규칙", () => {
  const css = readFileSync(
    resolve(process.cwd(), "src/episode-header/episode-header.css"),
    "utf8",
  ).replace(/\/\*[\s\S]*?\*\//g, "");

  const bodyOf = (selector: string): string => {
    const escaped = selector.replace(/\./g, "\\.");
    const match = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(css);
    return match?.[1] ?? "";
  };

  test("EH1-c. 트랙은 overflow: hidden이다(밀려 들어오는 채움을 자른다)", () => {
    expect(bodyOf(".ui-lynx-episode-header-track")).toMatch(/overflow:\s*hidden/);
  });

  test("EH1-d. 채움 등장 · 빛 규칙이 있고 시간 · 곡선은 토큰, scale 리터럴은 없다", () => {
    expect(bodyOf(".ui-lynx-episode-header-fill-enter")).toContain("animation");
    expect(bodyOf(".ui-lynx-episode-header-fill-sheen")).toContain("animation");
    const animations = [...css.matchAll(/animation(?:-[a-z-]+)?:\s*([^;}]+)/g)].map((match) =>
      (match[1] ?? "").replace(/var\([^)]*\)/g, " "),
    );
    for (const value of animations) {
      expect(value).not.toMatch(/\b\d+(?:\.\d+)?m?s\b/);
      expect(value).not.toMatch(/\b(?:ease-in-out|ease-in|ease-out|ease|linear|cubic-bezier)\b/);
    }
    const scaleCalls = [...css.matchAll(/\bscale\(([^()]*)\)/g)].map((match) => match[1] ?? "");
    for (const argument of scaleCalls) {
      expect(argument).not.toMatch(/^\s*(?!1\s*$)[+-]?(?:\d+\.?\d*|\.\d+)\s*$/);
    }
  });
});
