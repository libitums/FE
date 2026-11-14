// 연속 학습 모달의 엽전 보상 문구(ADR-0143)입니다 — 다섯 언어를 한 파일에 둡니다(각 언어의 껍데기 표가 자기 몫을 꽂습니다).
// 엽전은 화면에서 「Yeopjeon」으로 적습니다(ADR-0116 — 화면 문구에 한글을 쓰지 않음).
// 문구는 「lead + 강조(남은 날) + 꼬리(보상)」 세 토막으로 그려집니다 — 강조 토막만 색이 다릅니다.

import { n } from "./ui-copy-en-plural";

export type StreakRewardCopy = {
  /** 문구 앞머리 — 기존 문구의 칭찬을 그대로 씁니다. */
  readonly lead: string;
  /** 세 토막 사이를 띄우는가 — 띄어 쓰는 언어는 참, 일본어는 거짓. */
  readonly spaced: boolean;
  /** 강조 토막 — 다음 이정표까지 남은 날. */
  readonly moreDays: (days: number) => string;
  /** 꼬리 토막 — 그 이정표의 보상. */
  readonly toReward: (amount: number) => string;
  /** 큰 목표 줄의 왼쪽 글 — `14-day goal`. */
  readonly goal: (days: number) => string;
  readonly goalSpoken: (days: number, amount: number) => string;
  /** 보상 카드의 아래 줄 — `7-day streak reward`. */
  readonly rewardTitle: (days: number) => string;
  readonly rewardSpoken: (days: number, amount: number) => string;
  readonly collect: string;
};

export const streakRewardCopy: Readonly<
  Record<"en" | "es" | "id" | "ja" | "vi", StreakRewardCopy>
> = {
  en: {
    lead: "Amazing work!",
    spaced: true,
    moreDays: (days) => n(days, "more day", "more days"),
    toReward: (amount) => `to +${amount} Yeopjeon.`,
    goal: (days) => `${days}-day goal`,
    goalSpoken: (days, amount) => `${days}-day goal, +${amount} Yeopjeon`,
    rewardTitle: (days) => `${days}-day streak reward`,
    rewardSpoken: (days, amount) => `+${amount} Yeopjeon, ${days}-day streak reward`,
    collect: "Collect",
  },
  es: {
    lead: "¡Increíble!",
    spaced: true,
    moreDays: (days) => (days === 1 ? "1 día más" : `${days} días más`),
    toReward: (amount) => `para +${amount} Yeopjeon.`,
    goal: (days) => `Meta de ${days} días`,
    goalSpoken: (days, amount) => `Meta de ${days} días, +${amount} Yeopjeon`,
    rewardTitle: (days) => `Premio por racha de ${days} días`,
    rewardSpoken: (days, amount) => `+${amount} Yeopjeon, premio por racha de ${days} días`,
    collect: "Recoger",
  },
  id: {
    lead: "Kerja bagus!",
    spaced: true,
    moreDays: (days) => `${days} hari lagi`,
    toReward: (amount) => `menuju +${amount} Yeopjeon.`,
    goal: (days) => `Target ${days} hari`,
    goalSpoken: (days, amount) => `Target ${days} hari, +${amount} Yeopjeon`,
    rewardTitle: (days) => `Hadiah beruntun ${days} hari`,
    rewardSpoken: (days, amount) => `+${amount} Yeopjeon, hadiah beruntun ${days} hari`,
    collect: "Ambil",
  },
  ja: {
    lead: "すばらしい！",
    spaced: false,
    moreDays: (days) => `あと${days}日`,
    toReward: (amount) => `で+${amount} Yeopjeon！`,
    goal: (days) => `${days}日目標`,
    goalSpoken: (days, amount) => `${days}日目標、+${amount} Yeopjeon`,
    rewardTitle: (days) => `${days}日連続ボーナス`,
    rewardSpoken: (days, amount) => `+${amount} Yeopjeon、${days}日連続ボーナス`,
    collect: "受け取る",
  },
  vi: {
    lead: "Làm tốt lắm!",
    spaced: true,
    moreDays: (days) => `Còn ${days} ngày`,
    toReward: (amount) => `để nhận +${amount} Yeopjeon.`,
    goal: (days) => `Mục tiêu ${days} ngày`,
    goalSpoken: (days, amount) => `Mục tiêu ${days} ngày, +${amount} Yeopjeon`,
    rewardTitle: (days) => `Thưởng chuỗi ${days} ngày`,
    rewardSpoken: (days, amount) => `+${amount} Yeopjeon, thưởng chuỗi ${days} ngày`,
    collect: "Nhận",
  },
};
