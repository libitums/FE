// 태국어 문구표 구획 — common · shell · journeyMap · learningShell.
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

// 연속 학습 모달의 엽전 보상 문구(ADR-0143) — 다섯 언어 표(`ui-copy-streak-reward.ts`)의 태국어 몫입니다.
// 태국어는 낱말 사이를 띄우지 않지만 구절 사이는 띄우므로 세 토막 사이를 띄웁니다(spaced: true).
export const streakRewardTh: StreakRewardCopy = {
  lead: "เยี่ยมมาก!",
  spaced: true,
  moreDays: (days) => `อีก ${days} วัน`,
  toReward: (amount) => `จะได้รับ +${amount} Yeopjeon`,
  goal: (days) => `เป้าหมาย ${days} วัน`,
  goalSpoken: (days, amount) => `เป้าหมาย ${days} วัน, +${amount} Yeopjeon`,
  rewardTitle: (days) => `รางวัลเรียนต่อเนื่อง ${days} วัน`,
  rewardSpoken: (days, amount) => `+${amount} Yeopjeon, รางวัลเรียนต่อเนื่อง ${days} วัน`,
  collect: "รับรางวัล",
};

// 태국어는 복수형이 없어 수와 단위를 그대로 붙입니다.
export const commonTh: CommonCopy = {
  exitTo: { journey: "กลับไปที่แผนที่", roleplay: "กลับไปที่รายการ" },
  backToSettings: "กลับไปที่การตั้งค่า",
  back: "ย้อนกลับ",
  answerResult: { correct: "ถูก", incorrect: "ผิด" },
  answerResultSuffix: { correct: "ถูก", incorrect: "ผิด" },
  resultAnnouncement: (result) => `ผลลัพธ์, ${result === "correct" ? "ถูก" : "ผิด"}`,
  allQuestionsDone: "ทำครบทุกข้อแล้ว",
  seeResults: "ดูผลลัพธ์",
  next: "ถัดไป",
  continue: "ไปต่อ",
  check: "ตรวจคำตอบ",
  ok: "ตกลง",
  close: "ปิด",
  skip: "ข้าม",
  listening: "กำลังฟัง",
  send: "ส่ง",
  sendWithText: (text) => `ส่ง, ${text}`,
  me: "ฉัน",
  delete: "ลบ",
  startOver: "เริ่มใหม่",
  blank: "ช่องว่าง",
  selected: (label) => `${label}, เลือกแล้ว`,
  locked: (label) => `${label}, ล็อกอยู่`,
  stepTitle: (ordinal, activity) => `ขั้นที่ ${ordinal} · ${activity}`,
  count: {
    streakDays: (days) => `ต่อเนื่อง ${days} วัน`,
    trophies: (count) => `${count} ถ้วยรางวัล`,
    coins: (count) => `${count} เหรียญ`,
  },
};

export const shellTh: ShellCopy = {
  tabs: {
    journey: "การเดินทาง",
    roleplay: "บทบาทสมมติ",
    messenger: "แชท",
    ranking: "อันดับ",
    settings: "ตั้งค่า",
  },
  tabNew: { badge: "ใหม่", spoken: "ใหม่" },
  notifications: "การแจ้งเตือน",
  errorBoundary: { title: "เกิดข้อผิดพลาด", retry: "ลองอีกครั้ง" },
};

export const journeyMapTh: JourneyMapCopy = {
  start: "เริ่ม",
  activityCount: (completed, total) => `${completed}/${total} กิจกรรม`,
  activityProgressLabel: (completed, total) => `ทำเสร็จ ${completed} จาก ${total} กิจกรรม`,
  // 설명 줄: 끝의 마침표를 떼고, 번호는 두 자리로 채웁니다.
  episodeUnitLabel: (episodeLabel, unit) =>
    `${String(episodeLabel).replace(/\.$/, "")}, ส่วนที่ ${String(unit).padStart(2, "0")}`,
  statModal: {
    streakHero: (days) => `ต่อเนื่อง ${days} วัน`,
    episodesClearedHero: (count) => `จบแล้ว ${count} ตอน`,
    slotProgress: (completed, total) => `สำเร็จ ${completed} จาก ${total}`,
    kind: {
      streak: {
        title: "วันติดต่อกัน",
        message: "เก่งมาก! พรุ่งนี้กลับมาเพื่อรักษาสถิติการเรียนต่อเนื่องนะ!",
      },
      trophy: {
        title: "จบตอนแล้ว!",
        message: "เก่งมาก! พรุ่งนี้กลับมาเรียนตอนถัดไปให้จบนะ!",
      },
    },
    continue: "ไปต่อ →",
    // 요일 약칭 — อา(일) จ(월) อ(화) พ(수) พฤ(목) ศ(금) ส(토)입니다.
    weekdays: ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"],
    reward: streakRewardTh,
  },
};

export const learningShellTh: LearningShellCopy = {
  exitLesson: "ออกจากบทเรียน",
  formLabels: {
    listening: "การฟัง",
    "sentence-order": "เรียงคำ",
    "word-choice": "เลือกคำ",
    culture: "วัฒนธรรม",
    speaking: "การพูด",
    writing: "การเขียน",
    typing: "การพิมพ์",
    "vocab-card": "คำศัพท์ใหม่",
    "pair-match": "จับคู่",
    "culture-card": "วัฒนธรรม",
    "syllable-build": "ประกอบพยางค์",
    "read-aloud": "การพูด",
    "speak-word": "การพูด",
  },
  progressLabel: (ordinal, total) => `ข้อ ${String(ordinal)} จาก ${String(total)}`,
  cultureQuizLabel: "ควิซวัฒนธรรม",
  completionDescription: "พักหายใจสักครู่ คุณพร้อมสำหรับขั้นต่อไปแล้ว",
  completedQuestions: (count) => `ทำเสร็จ ${count} ข้อ`,
  // 완료 카드(시안 A)의 활동 타일 낭독 이름과, 숫자 타일의 보이는 이름(대문자 — 결과 화면 `PERFECT LESSON`과 같은 갈래)입니다.
  completedActivities: (count) => `ทำเสร็จ ${count} กิจกรรม`,
  completionStats: {
    questions: "คำถาม",
    activities: "กิจกรรม",
  },
  leaveDialog: {
    title: "ออกจากบทเรียนนี้ไหม",
    description: "คำตอบที่ทำไว้จะไม่ถูกบันทึก ครั้งหน้าจะต้องเริ่มใหม่ตั้งแต่ต้น",
    leave: "ออก",
    stay: "เรียนต่อ",
  },
  headerNoQuestions: (formLabel) => `${formLabel}, ไม่มีคำถาม`,
  headerQuestionOf: (formLabel, ordinal, count) => `${formLabel}, ข้อ ${ordinal} จาก ${count}`,
  review: {
    intro: (count) => `มาแก้ข้อที่ผิด ${count} ข้อกัน`,
    remaining: (count) => `อีก ${count} ข้อจะผ่าน`,
    unlocked: "คะแนนพอผ่านแล้ว",
    progress: (ordinal, total) => `ทบทวน ${ordinal} จาก ${total}`,
    headerOf: (formLabel, ordinal, total) => `${formLabel}, ทบทวน ${ordinal} จาก ${total}`,
    formSuffix: " · ลองอีกครั้ง",
    fixed: "แก้ได้แล้ว!",
    missed: "ยังไม่ถูกนัก",
    missedLine: "ไม่เป็นไร — ไปต่อกัน",
  },
};

export const specialUnitMapTh: SpecialUnitMapCopy = {
  accessibilityLabel: (name) => `พิเศษ, ${name}`,
};

export const progressLoadTh: ProgressLoadCopy = {
  loading: "กำลังโหลดความคืบหน้าของคุณ…",
  loadingAnnouncement: "กำลังโหลดความคืบหน้าของคุณ",
  failed: "โหลดความคืบหน้าของคุณไม่ได้",
  retry: "ลองอีกครั้ง",
};

export const splashTh: SplashCopy = {
  updating: "กำลังอัปเดตตอนต่าง ๆ",
  updatingLabel: (percent) => `กำลังอัปเดตตอนต่าง ๆ, ${percent}%`,
};
