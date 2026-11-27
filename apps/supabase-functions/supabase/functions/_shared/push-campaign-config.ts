// 자동 캠페인 설정(ADR-0208, 사용자 결정 2026-11-27) — 빈도 실험입니다. 앞선 실험(보냄 / 안 보냄 · 문구 A/B, 72시간에 한 번)은
// 어느 칸도 차이가 나지 않아 걷었습니다(2026-11-27 집계: 가장 큰 차이가 episode-mid 3.5% vs 2.7%).
// - 칸 셋(사람마다 고정, 1/3씩): 안 보냄 · 하루 1번(현지 20시) · 하루 2번(현지 12시 + 20시).
// - 쉰 지 7일까지 매일, 7일째 저녁은 「매일 알림을 멈춘다」. 그 뒤는 10 · 14 · 21 · 30 · 45 · 60일째 저녁에 복귀 알림(보내는 두 칸 모두).
// - 문구는 진도 단계 셋(튜토리얼 · 다음 에피소드 · 에피소드 중간)마다 따로, 날마다 돌려 써 같은 말이 연달아 가지 않습니다.

import { midCopy } from "./push-campaign-copy-mid.ts";
import { nextCopy } from "./push-campaign-copy-next.ts";
import { lastCopy, winbackAnyCopy } from "./push-campaign-copy-shared.ts";
import { tutorialCopy } from "./push-campaign-copy-tutorial.ts";
import type { CampaignConfig, Copy, StageCopy } from "./push-campaign-types.ts";

const withShared = (copy: StageCopy): StageCopy => ({
  ...copy,
  winback: [...copy.winback, winbackAnyCopy],
});

export const pushCampaignConfig: CampaignConfig = {
  localHours: { noon: 12, evening: 20 },
  minIdleHours: 12,
  minGapHours: 6,
  dailyDays: 7,
  winbackDays: [10, 14, 21, 30, 45, 60],
  stages: {
    "tutorial-cover": "tutorial",
    "tutorial-lesson1": "tutorial",
    "tutorial-lesson2": "tutorial",
    "tutorial-rest": "tutorial",
    "episode-next": "next",
    "episode-mid": "mid",
  },
  copy: {
    tutorial: withShared(tutorialCopy),
    next: withShared(nextCopy),
    mid: withShared(midCopy),
  },
  lastCopy,
};

/** 설정의 모든 문구 — 「단계:자리:번호」 이름과 함께(언어 검증 테스트용). */
export function allCampaignCopy(config: CampaignConfig): [string, Copy][] {
  const out: [string, Copy][] = [["last", config.lastCopy]];
  for (const [stage, copy] of Object.entries(config.copy))
    for (const kind of ["noon", "evening", "winback"] as const)
      copy[kind].forEach((entry, index) => out.push([`${stage}:${kind}:${index}`, entry]));
  return out;
}
