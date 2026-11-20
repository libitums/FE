// 미얀마어 문구표 구획 — common · shell · journeyMap · learningShell.
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

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

// 연속 학습 모달의 엽전 보상 문구(ADR-0143)입니다 — 미얀마어는 구절 사이를 띄어 쓰므로 `spaced`는 참입니다.
export const streakRewardMy: StreakRewardCopy = {
  lead: "အရမ်းတော်ပါတယ်!",
  spaced: true,
  moreDays: (days) => `နောက်ထပ် ${days} ရက်`,
  toReward: (amount) => `ဆက်လေ့လာရင် +${amount} Yeopjeon ရပါမယ်။`,
  goal: (days) => `${days} ရက် ပန်းတိုင်`,
  goalSpoken: (days, amount) => `${days} ရက် ပန်းတိုင်၊ +${amount} Yeopjeon`,
  rewardTitle: (days) => `${days} ရက် ဆက်တိုက် ဆုလာဘ်`,
  rewardSpoken: (days, amount) => `+${amount} Yeopjeon၊ ${days} ရက် ဆက်တိုက် ဆုလာဘ်`,
  collect: "ယူရန်",
};

// 미얀마어는 복수형이 없어 수와 단위를 그대로 붙입니다.
export const commonMy: CommonCopy = {
  exitTo: { journey: "မြေပုံသို့", roleplay: "စာရင်းသို့" },
  backToSettings: "ဆက်တင်များသို့",
  back: "နောက်သို့",
  answerResult: { correct: "မှန်", incorrect: "မှား" },
  answerResultSuffix: { correct: "မှန်", incorrect: "မှား" },
  resultAnnouncement: (result) => `ရလဒ်၊ ${result === "correct" ? "မှန်" : "မှား"}`,
  allQuestionsDone: "မေးခွန်းအားလုံး ပြီးပါပြီ",
  seeResults: "ရလဒ် ကြည့်ရန်",
  next: "ရှေ့သို့",
  continue: "ရှေ့ဆက်ရန်",
  check: "စစ်ဆေးရန်",
  ok: "OK",
  close: "ပိတ်ရန်",
  skip: "ကျော်ရန်",
  listening: "နားထောင်နေသည်",
  send: "ပို့ရန်",
  sendWithText: (text) => `ပို့ရန်၊ ${text}`,
  me: "ကျွန်ုပ်",
  delete: "ဖျက်ရန်",
  startOver: "အစမှ ပြန်စရန်",
  blank: "ကွက်လပ်",
  selected: (label) => `${label}၊ ရွေးထားသည်`,
  locked: (label) => `${label}၊ သော့ခတ်ထားသည်`,
  stepTitle: (ordinal, activity) => `အဆင့် ${ordinal} · ${activity}`,
  count: {
    streakDays: (days) => `${days} ရက် ဆက်တိုက်`,
    trophies: (count) => `ဖလား ${count}`,
    coins: (count) => `ဒင်္ဂါး ${count}`,
  },
};

export const shellMy: ShellCopy = {
  tabs: {
    journey: "ခရီးစဉ်",
    roleplay: "သရုပ်ဆောင်",
    messenger: "ချတ်",
    settings: "ဆက်တင်",
  },
  tabNew: { badge: "အသစ်", spoken: "အသစ်" },
  notifications: "အသိပေးချက်များ",
  errorBoundary: { title: "တစ်ခုခု မှားယွင်းသွားပါသည်", retry: "ထပ်စမ်းရန်" },
};

export const journeyMapMy: JourneyMapCopy = {
  start: "စတင်ရန်",
  activityCount: (completed, total) => `လုပ်ဆောင်ချက် ${completed}/${total}`,
  activityProgressLabel: (completed, total) => `လုပ်ဆောင်ချက် ${total} ခုအနက် ${completed} ခု ပြီးပါပြီ`,
  // 설명 줄: 끝의 마침표를 떼고, 번호는 두 자리로 채웁니다.
  episodeUnitLabel: (episodeLabel, unit) =>
    `${String(episodeLabel).replace(/[.။]$/, "")}၊ အပိုင်းခွဲ ${String(unit).padStart(2, "0")}`,
  statModal: {
    streakHero: (days) => `${days} ရက် ဆက်တိုက်`,
    episodesClearedHero: (count) => `အပိုင်း ${count} ခု ပြီးပါပြီ`,
    slotProgress: (completed, total) => `${total} ခုအနက် ${completed} ခု ပြီးပါပြီ`,
    kind: {
      streak: {
        title: "ရက် ဆက်တိုက်",
        message: "အရမ်းတော်ပါတယ်! ဆက်တိုက်မပျက်အောင် မနက်ဖြန် ပြန်လာခဲ့ပါ!",
      },
      trophy: {
        title: "အပိုင်း ပြီးပါပြီ!",
        message: "အရမ်းတော်ပါတယ်! နောက်အပိုင်း ပြီးအောင် မနက်ဖြန် ပြန်လာခဲ့ပါ!",
      },
    },
    continue: "ရှေ့ဆက်ရန် →",
    // 요일 약칭 — 미얀마 달력에서 흔히 쓰는 한 음절 꼴(တနင်္ဂနွေ → နွေ … စနေ → နေ)입니다.
    weekdays: ["နွေ", "လာ", "ဂါ", "ဟူး", "တေး", "ကြာ", "နေ"],
    reward: streakRewardMy,
  },
};

export const learningShellMy: LearningShellCopy = {
  exitLesson: "သင်ခန်းစာမှ ထွက်ရန်",
  formLabels: {
    listening: "နားထောင်ခြင်း",
    "sentence-order": "စကားလုံးစီခြင်း",
    "word-choice": "စကားလုံးရွေးခြင်း",
    culture: "ယဉ်ကျေးမှု",
    speaking: "ပြောခြင်း",
    writing: "ရေးခြင်း",
    typing: "စာရိုက်ခြင်း",
    "vocab-card": "စကားလုံးသစ်",
    "pair-match": "အတွဲချိတ်ခြင်း",
    "culture-card": "ယဉ်ကျေးမှု",
    "syllable-build": "ဝဏ္ဏဖွဲ့ခြင်း",
    "read-aloud": "ပြောခြင်း",
    "speak-word": "ပြောခြင်း",
  },
  progressLabel: (ordinal, total) => `မေးခွန်း ${String(ordinal)} / ${String(total)}`,
  cultureQuizLabel: "ယဉ်ကျေးမှု ပဟေဠိ",
  completionDescription: "အသက်ပြင်းပြင်း ရှူလိုက်ပါ။ နောက်တစ်ဆင့်အတွက် အသင့်ဖြစ်ပါပြီ။",
  completedQuestions: (count) => `မေးခွန်း ${count} ခု ပြီးပါပြီ`,
  // 완료 카드(시안 A)의 활동 타일 낭독 이름과, 숫자 타일의 보이는 이름(대문자 — 결과 화면 `PERFECT LESSON`과 같은 갈래)입니다.
  completedActivities: (count) => `လုပ်ဆောင်ချက် ${count} ခု ပြီးပါပြီ`,
  completionStats: {
    questions: "မေးခွန်း",
    activities: "လုပ်ဆောင်ချက်",
  },
  leaveDialog: {
    title: "ဤသင်ခန်းစာမှ ထွက်မလား။",
    description: "ယခုအထိ ဖြေထားသည်များကို မသိမ်းပါ။ နောက်တစ်ကြိမ် အစမှ ပြန်စရပါမည်။",
    leave: "ထွက်ရန်",
    stay: "ဆက်လေ့လာရန်",
  },
  headerNoQuestions: (formLabel) => `${formLabel}၊ မေးခွန်း မရှိပါ`,
  headerQuestionOf: (formLabel, ordinal, count) => `${formLabel}၊ မေးခွန်း ${ordinal} / ${count}`,
  review: {
    intro: (count) => `အမှား ${count} ခုကို အတူ ပြင်ကြရအောင်`,
    remaining: (count) => `အောင်ရန် နောက်ထပ် ${count} ခု`,
    unlocked: "အောင်မှတ် ပြည့်ပါပြီ",
    progress: (ordinal, total) => `ပြန်လေ့ကျင့် ${ordinal} / ${total}`,
    headerOf: (formLabel, ordinal, total) => `${formLabel}၊ ပြန်လေ့ကျင့် ${total} ခုအနက် ${ordinal}`,
    formSuffix: " · ထပ်စမ်း",
    fixed: "ပြင်ပြီးပါပြီ!",
    missed: "သိပ်မမှန်သေးဘူး",
    missedLine: "ကိစ္စမရှိပါ — ဆက်သွားကြရအောင်။",
  },
};

export const specialUnitMapMy: SpecialUnitMapCopy = {
  accessibilityLabel: (name) => `အထူး၊ ${name}`,
};

export const progressLoadMy: ProgressLoadCopy = {
  loading: "သင့်တိုးတက်မှုကို ဖွင့်နေသည်…",
  loadingAnnouncement: "သင့်တိုးတက်မှုကို ဖွင့်နေသည်",
  failed: "သင့်တိုးတက်မှုကို ဖွင့်၍ မရပါ။",
  retry: "ထပ်စမ်းရန်",
};

export const splashMy: SplashCopy = {
  updating: "အပိုင်းများကို အပ်ဒိတ်လုပ်နေသည်",
  updatingLabel: (percent) => `အပိုင်းများကို အပ်ဒိတ်လုပ်နေသည်၊ ${percent}%`,
};
