// 일본어 문구표 구획 — common · shell · journeyMap · learningShell.
// 번역 초안 — 원어민 검수 필요(ADR-0098).

import type {
  CommonCopy,
  JourneyMapCopy,
  LearningShellCopy,
  ShellCopy,
} from "./ui-copy-sections.contract";
import type { ProgressLoadCopy } from "../screens/journey-map/journey-map-load.contract";
import type { SplashCopy } from "../screens/splash/splash.contract";
import type { SpecialUnitMapCopy } from "../screens/journey-map/journey-special-unit.contract";

// 일본어는 복수형이 없어 수와 조수사를 그대로 붙입니다.
export const commonJa: CommonCopy = {
  exitTo: { journey: "マップに戻る", roleplay: "リストに戻る" },
  backToSettings: "設定に戻る",
  back: "戻る",
  answerResult: { correct: "正解", incorrect: "不正解" },
  answerResultSuffix: { correct: "正解", incorrect: "不正解" },
  resultAnnouncement: (result) => `結果、${result === "correct" ? "正解" : "不正解"}`,
  allQuestionsDone: "全問終了",
  seeResults: "結果を見る",
  next: "次へ",
  continue: "続ける",
  check: "確認",
  ok: "OK",
  close: "閉じる",
  skip: "スキップ",
  listening: "聞き取り中",
  send: "送信",
  sendWithText: (text) => `送信、${text}`,
  me: "自分",
  delete: "削除",
  startOver: "最初からやり直す",
  blank: "空欄",
  selected: (label) => `${label}、選択済み`,
  locked: (label) => `${label}、ロック中`,
  stepTitle: (ordinal, activity) => `ステップ${ordinal} · ${activity}`,
  count: {
    streakDays: (days) => `${days}日連続`,
    trophies: (count) => `トロフィー${count}個`,
    gems: (count) => `ジェム${count}個`,
    coins: (count) => `コイン${count}枚`,
  },
};

export const shellJa: ShellCopy = {
  tabs: {
    journey: "ジャーニー",
    roleplay: "ロールプレイ",
    messenger: "チャット",
    settings: "設定",
  },
  notifications: "お知らせ",
  errorBoundary: { title: "問題が発生しました", retry: "再試行" },
};

export const journeyMapJa: JourneyMapCopy = {
  start: "スタート",
  activityCount: (completed, total) => `${completed}/${total} アクティビティ`,
  activityProgressLabel: (completed, total) => `${total}件中${completed}件のアクティビティ完了`,
  // 설명 줄: 끝의 마침표를 떼고, 번호는 두 자리로 채웁니다.
  episodeUnitLabel: (episodeLabel, unit) =>
    `${String(episodeLabel).replace(/\.$/, "")}、ユニット${String(unit).padStart(2, "0")}`,
  statModal: {
    streakHero: (days) => `${days}日連続`,
    episodesClearedHero: (count) => `${count}エピソードをクリア`,
    slotProgress: (completed, total) => `${total}件中${completed}件完了`,
    kind: {
      streak: {
        title: "日連続",
        message: "すばらしい！明日も来て、連続記録をキープしましょう！",
      },
      trophy: {
        title: "エピソードクリア！",
        // Figma 원문은 "…to clear chapter"입니다. 제목(Episode Clear!)과 용어를 맞추고 관사 ·
        // 문장 부호를 보태 고쳤습니다(PR #124 리뷰). Figma 쪽 반영이 뒤따라야 합니다.
        message: "すばらしい！明日も来て、次のエピソードをクリアしましょう！",
      },
    },
    continue: "続ける →",
    // 요일 약칭은 디자인 표기 그대로입니다.
    weekdays: ["日", "月", "火", "水", "木", "金", "土"],
  },
};

export const learningShellJa: LearningShellCopy = {
  exitLesson: "レッスンを終了",
  formLabels: {
    listening: "リスニング",
    "sentence-order": "並べ替え",
    "word-choice": "単語選択",
    culture: "文化",
    speaking: "スピーキング",
    writing: "ライティング",
    typing: "タイピング",
    "vocab-card": "新しい単語",
    "pair-match": "マッチング",
    "culture-card": "文化",
    "syllable-build": "つづり",
    "read-aloud": "スピーキング",
    "speak-word": "スピーキング",
  },
  progressLabel: (ordinal, total) => `レッスン ${String(ordinal)} / ${String(total)}`,
  cultureQuizLabel: "文化クイズ",
  completionDescription: "ひと息つきましょう。次のステップの準備ができました。",
  completedQuestions: (count) => `${count}問完了`,
  // 완료 카드(시안 A)의 활동 타일 낭독 이름과, 숫자 타일의 보이는 이름(대문자 — 결과 화면 `PERFECT LESSON`과 같은 갈래)입니다.
  completedActivities: (count) => `${count}個のアクティビティ完了`,
  completionStats: {
    questions: "問題",
    activities: "アクティビティ",
  },
  leaveDialog: {
    title: "このレッスンを終了しますか？",
    description: "ここまでの回答は保存されず、次回は最初からになります。",
    leave: "終了",
    stay: "続ける",
  },
  headerNoQuestions: (formLabel) => `${formLabel}、問題なし`,
  headerQuestionOf: (formLabel, ordinal, count) => `${formLabel}、${count}問中${ordinal}問目`,
  review: {
    intro: (count) => `${count}個のミスを直しましょう`,
    remaining: (count) => `合格まであと${count}問`,
    unlocked: "合格できます！",
    progress: (ordinal, total) => `復習 ${ordinal} / ${total}`,
    headerOf: (formLabel, ordinal, total) => `${formLabel}、復習${total}問中${ordinal}問目`,
    formSuffix: " · もう一度",
    fixed: "直せました！",
    missed: "おしい！",
    missedLine: "大丈夫、このまま進みましょう。",
  },
};

export const specialUnitMapJa: SpecialUnitMapCopy = {
  accessibilityLabel: (name) => `スペシャル、${name}`,
};

export const progressLoadJa: ProgressLoadCopy = {
  loading: "進捗を読み込み中…",
  loadingAnnouncement: "進捗を読み込み中",
  failed: "進捗を読み込めませんでした。",
  retry: "再試行",
};

export const splashJa: SplashCopy = {
  updating: "エピソードを更新中",
  updatingLabel: (percent) => `エピソードを更新中、${percent}%`,
};
