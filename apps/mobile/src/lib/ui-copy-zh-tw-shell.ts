// 대만 중국어(번체, zh-TW) 문구표 구획 — common · shell · journeyMap · learningShell 덩어리(ADR-0185).
// 번역 초안 — 원어민 검수 필요(ADR-0185).

import type { StreakRewardCopy } from "./ui-copy-streak-reward";
import type {
  CommonCopy,
  JourneyMapCopy,
  LearningShellCopy,
  ShellCopy,
} from "./ui-copy-sections.contract";
import type { ProgressLoadCopy } from "../screens/journey-map/journey-map-load.contract";
import type { SplashCopy } from "../screens/splash/splash.contract";
import type { SpecialUnitMapCopy } from "../screens/journey-map/journey-special-unit.contract";

// 연속 학습 모달의 엽전 보상 문구(ADR-0143) — 다섯 언어 표(`ui-copy-streak-reward.ts`)의 대만 중국어 몫입니다.
// 중국어는 낱말 · 구절 사이를 띄우지 않으므로 세 토막을 붙여 씁니다(spaced: false).
export const streakRewardZhTw: StreakRewardCopy = {
  lead: "太厲害了！",
  spaced: false,
  moreDays: (days) => `再${days}天`,
  toReward: (amount) => `就能拿到 +${amount} Yeopjeon！`,
  goal: (days) => `${days}天目標`,
  goalSpoken: (days, amount) => `${days}天目標，+${amount} Yeopjeon`,
  rewardTitle: (days) => `連續${days}天獎勵`,
  rewardSpoken: (days, amount) => `+${amount} Yeopjeon，連續${days}天獎勵`,
  collect: "領取",
};

// 중국어는 복수형이 없어 수와 단위를 그대로 붙입니다.
export const commonZhTw: CommonCopy = {
  exitTo: { journey: "回到地圖", roleplay: "回到列表" },
  backToSettings: "回到設定",
  back: "返回",
  answerResult: { correct: "正確", incorrect: "錯誤" },
  answerResultSuffix: { correct: "正確", incorrect: "錯誤" },
  resultAnnouncement: (result) => `結果，${result === "correct" ? "正確" : "錯誤"}`,
  allQuestionsDone: "所有題目都完成了",
  seeResults: "查看結果",
  next: "下一步",
  continue: "繼續",
  check: "檢查",
  ok: "確定",
  close: "關閉",
  skip: "略過",
  listening: "聆聽中",
  send: "傳送",
  sendWithText: (text) => `傳送，${text}`,
  me: "我",
  delete: "刪除",
  startOver: "重新開始",
  blank: "空格",
  selected: (label) => `${label}，已選取`,
  locked: (label) => `${label}，已鎖定`,
  stepTitle: (ordinal, activity) => `步驟 ${ordinal} · ${activity}`,
  count: {
    streakDays: (days) => `連續${days}天`,
    trophies: (count) => `${count}座獎盃`,
    coins: (count) => `${count}枚錢幣`,
  },
};

export const shellZhTw: ShellCopy = {
  tabs: {
    journey: "旅程",
    roleplay: "角色扮演",
    messenger: "聊天",
    ranking: "排行榜",
    settings: "設定",
  },
  tabNew: { badge: "NEW", spoken: "新" },
  notifications: "通知",
  errorBoundary: { title: "發生錯誤", retry: "再試一次" },
};

export const journeyMapZhTw: JourneyMapCopy = {
  start: "開始",
  activityCount: (completed, total) => `${completed}/${total} 個活動`,
  activityProgressLabel: (completed, total) => `已完成${completed}個活動，共${total}個`,
  // 설명 줄: 끝의 마침표를 떼고, 번호는 두 자리로 채웁니다.
  episodeUnitLabel: (episodeLabel, unit) =>
    `${String(episodeLabel).replace(/\.$/, "")}，單元 ${String(unit).padStart(2, "0")}`,
  statModal: {
    streakHero: (days) => `連續${days}天`,
    episodesClearedHero: (count) => `已完成${count}集`,
    slotProgress: (completed, total) => `已完成${completed}個，共${total}個`,
    kind: {
      streak: {
        title: "天連續學習",
        message: "太厲害了！明天再回來，繼續保持連續紀錄吧！",
      },
      trophy: {
        title: "這一集完成！",
        message: "太厲害了！明天再回來，完成下一集吧！",
      },
    },
    continue: "繼續 →",
    // 요일 약칭 — 日(일) 一(월) 二(화) 三(수) 四(목) 五(금) 六(토)입니다.
    weekdays: ["日", "一", "二", "三", "四", "五", "六"],
    reward: streakRewardZhTw,
  },
};

export const learningShellZhTw: LearningShellCopy = {
  exitLesson: "離開課程",
  formLabels: {
    listening: "聽力",
    "sentence-order": "排列句子",
    "word-choice": "選擇單字",
    culture: "文化",
    speaking: "口說",
    writing: "書寫",
    typing: "打字",
    "vocab-card": "新單字",
    "pair-match": "配對",
    "culture-card": "文化",
    "syllable-build": "拼字",
    "read-aloud": "口說",
    "speak-word": "口說",
  },
  progressLabel: (ordinal, total) => `第${String(ordinal)}題，共${String(total)}題`,
  cultureQuizLabel: "文化測驗",
  completionDescription: "先喘口氣。你已經準備好進入下一步了。",
  completedQuestions: (count) => `已完成${count}題`,
  // 완료 카드(시안 A)의 활동 타일 낭독 이름과, 숫자 타일의 보이는 이름(대문자 — 결과 화면 `PERFECT LESSON`과 같은 갈래)입니다.
  completedActivities: (count) => `已完成${count}個活動`,
  completionStats: {
    questions: "題目",
    activities: "活動",
  },
  leaveDialog: {
    title: "要離開這一課嗎？",
    description: "目前的作答不會儲存，下次要從頭開始。",
    leave: "離開",
    stay: "繼續學習",
  },
  headerNoQuestions: (formLabel) => `${formLabel}，沒有題目`,
  headerQuestionOf: (formLabel, ordinal, count) => `${formLabel}，第${ordinal}題，共${count}題`,
  review: {
    intro: (count) => `來訂正${count}題錯題吧`,
    remaining: (count) => `再${count}題就能通過`,
    unlocked: "已達通過標準",
    progress: (ordinal, total) => `複習第${ordinal}題，共${total}題`,
    headerOf: (formLabel, ordinal, total) => `${formLabel}，複習第${ordinal}題，共${total}題`,
    formSuffix: " · 再試一次",
    fixed: "改對了！",
    missed: "差一點",
    missedLine: "沒關係——繼續加油。",
  },
};

export const specialUnitMapZhTw: SpecialUnitMapCopy = {
  accessibilityLabel: (name) => `特別篇，${name}`,
};

export const progressLoadZhTw: ProgressLoadCopy = {
  loading: "正在載入你的進度…",
  loadingAnnouncement: "正在載入你的進度",
  failed: "無法載入你的進度。",
  retry: "再試一次",
};

export const splashZhTw: SplashCopy = {
  updating: "正在更新集數",
  updatingLabel: (percent) => `正在更新集數，${percent}%`,
};
