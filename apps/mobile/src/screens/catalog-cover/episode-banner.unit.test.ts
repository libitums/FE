import { motion } from "@libitums/design-tokens";
import { motionDurationMs } from "@libitums/ui-lynx/motion";
import { describe, expect, test } from "vitest";

import {
  EPISODE_BANNER_HOLD_MS,
  claimEpisodeBannerDone,
  episodeBannerMotionOf,
  episodeBannerTextClassName,
  episodeBannerTextOf,
} from "./episode-banner";

// `unit` 계층: 배너의 유지 시간 · 문구 고르기 · 모션 변형 · 닫힘 가드만 봅니다.

describe("episodeBannerTextOf", () => {
  test("EB1. 종류에 따라 시작 문구와 클리어 문구를 고른다", () => {
    const copy = { episodeStart: "시작-대역", episodeClear: "클리어-대역" };

    expect(episodeBannerTextOf("start", copy)).toBe("시작-대역");
    expect(episodeBannerTextOf("clear", copy)).toBe("클리어-대역");
  });
});

describe("episodeBannerMotionOf", () => {
  test("EB2. standard는 reward, reduced는 fade", () => {
    expect(episodeBannerMotionOf("standard")).toBe("reward");
    expect(episodeBannerMotionOf("reduced")).toBe("fade");
  });
});

describe("episodeBannerTextClassName", () => {
  test("EB3. 기본 클래스에 변형 클래스를 붙인다", () => {
    expect(episodeBannerTextClassName("reward")).toBe(
      "episode-banner-screen-text episode-banner-screen-text-motion-reward",
    );
    expect(episodeBannerTextClassName("fade")).toBe(
      "episode-banner-screen-text episode-banner-screen-text-motion-fade",
    );
  });
});

describe("claimEpisodeBannerDone", () => {
  test("EB4. 같은 가드는 처음만 true이고 가드를 닫는다", () => {
    const guard = { done: false };

    expect(claimEpisodeBannerDone(guard)).toBe(true);
    expect(guard.done).toBe(true);
    expect(claimEpisodeBannerDone(guard)).toBe(false);
    expect(claimEpisodeBannerDone(guard)).toBe(false);
  });

  test("EB4. 다른 가드는 서로 독립이다", () => {
    const a = { done: false };
    const b = { done: false };

    expect(claimEpisodeBannerDone(a)).toBe(true);
    expect(claimEpisodeBannerDone(b)).toBe(true);
    expect(claimEpisodeBannerDone(a)).toBe(false);
    expect(claimEpisodeBannerDone(b)).toBe(false);
  });
});

describe("EPISODE_BANNER_HOLD_MS", () => {
  test("EB5. 등장 모션을 마치고도 글자를 읽을 시간이 남는다", () => {
    expect(Number.isInteger(EPISODE_BANNER_HOLD_MS)).toBe(true);
    expect(EPISODE_BANNER_HOLD_MS).toBeGreaterThan(0);
    expect(
      EPISODE_BANNER_HOLD_MS - motionDurationMs(motion.duration.reward),
    ).toBeGreaterThanOrEqual(motionDurationMs(motion.duration.d9));
  });
});
