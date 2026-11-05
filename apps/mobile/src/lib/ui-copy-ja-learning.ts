// 일본어 문구표 구획 — 학습 활동(listening ~ lessonComplete).
// 번역 초안 — 원어민 검수 필요(ADR-0098).
// 일본어는 복수형이 없어 수와 조수사를 그대로 붙입니다. 대문자 문구는 대소문자가 없어 그대로 씁니다.

import type {
  AssessmentCopy,
  LessonCompleteCopy,
  ListeningCopy,
  SentenceOrderCopy,
  SpeakingCopy,
  WordChoiceCopy,
} from "./ui-copy-sections.contract";
import type { LearningItemGuideCopy } from "./learning-item-guide.contract";

export const listeningJa: ListeningCopy = {
  instruction: "文の意味を選んでください。",
  playback: { pause: "一時停止", resume: "再開", play: "再生" },
  playFromStart: "最初から再生",
  slow: "ゆっくり",
  playAgain: "もう一度再生",
  stop: "停止",
};

export const wordChoiceJa: WordChoiceCopy = {
  instruction: "合う単語を選んでください。",
  culture: {
    sceneInstruction: "何と言いますか？",
    feedbackTitle: {
      scene: { correct: "いい返事！", incorrect: "おしい！" },
      question: { correct: "正解！", incorrect: "おしい！" },
    },
  },
};

export const sentenceOrderJa: SentenceOrderCopy = {
  instruction: "会話を完成させましょう。",
  placedChip: (text, position) => `${text}、${position}番目`,
  dialogueSpeaker: { counterpart: "相手", me: "あなた" },
  dialogueTurn: (speaker, position, text) => `${speaker}、${position}番目の発言：${text}`,
  dialogueEmptyTurn: (speaker, position) => `${speaker}、${position}番目の発言、空欄`,
  dialogueLine: {
    me: (text) => `あなたのセリフ：${text}`,
    counterpart: (text) => `相手のセリフ：${text}`,
  },
};

export const speakingJa: SpeakingCopy = {
  instruction: "文を声に出して読みましょう。",
  speak: "話す",
  stopSpeaking: "話すのをやめる",
  tryAgain: "もう一度",
  dictationDisabled:
    "Siriまたは音声入力がオフです。「設定」>「一般」>「キーボード」>「音声入力」をオンにしてから、もう一度お試しください。",
  tapToContinue: "画面をタップして続ける",
  recognitionUnavailable: "今は音声認識を使えません。「スキップ」をタップして続けてください。",
};

export const assessmentJa: AssessmentCopy = {
  activity: "評価",
  verdict: { passed: "合格", failed: "不合格" },
  itemTitle: (ordinal) => `問題${ordinal}`,
  announcement: (verdict) => `評価結果、${verdict === "passed" ? "合格" : "不合格"}`,
};

export const lessonCompleteJa: LessonCompleteCopy = {
  rewardDiamonds: (count) => `報酬、ダイヤ${count}個`,
  grade: (grade) => `評価 ${grade}`,
  gradeName: (grade) => grade,
  outcome: { passed: "レッスン完了", failed: "レッスン不合格" },
  mistakes: (count) => (count === 0 ? "ミスなし" : `ミス${count}個`),
  skippedSuffix: (count) => (count === 0 ? "" : `、スキップした問題${count}問`),
  nextLesson: "次のレッスン",
  nextFinal: "最終テスト",
  continueStory: "ストーリーを続ける",
  title: { perfect: "パーフェクト！", complete: "レッスン完了！", failed: "レッスン失敗" },
  subtitle: (mistakeCount) =>
    mistakeCount === 0
      ? "このレッスンはノーミスでした"
      : `このレッスンのミスは${mistakeCount}個でした`,
  streakLabel: (days) => `${days}日連続`,
  rewardLabel: (count) => `+${count} 報酬`,
  tryAgain: "もう一度",
  review: {
    soClose: "おしい！",
    fixedOf: (fixed, total) => `${total}個のミスのうち${fixed}個を直しました`,
    dotsLabel: (fixed, total) => `${total}個のミスのうち${fixed}個を修正`,
    neededMore: (count) =>
      `あと${count}問正解が必要でした。もう一度レッスンに挑戦しましょう。今度はもっと簡単に感じるはずです。`,
  },
};

// 학습 문항 안내 문구입니다. 닫는 법 줄은 `episodeIntro.guide.continue`를 씁니다.
export const learningItemGuideJa: LearningItemGuideCopy = {
  "sentence-order": {
    title: "今回はピースが1つだけ",
    description:
      "いつもは複数のピースを並べますが、今回は1つだけです。タップしてから「確認」をタップしてください。",
  },
  "activity-vocab-card": {
    title: "新しい単語",
    description: "音声を聞いて、意味を確認しましょう。準備ができたら「次へ」をタップ。",
  },
  "activity-word-choice": {
    title: "ひとつ選ぶ",
    description: "合う答えを選んで「確認」をタップ。",
  },
  "activity-listening": {
    title: "まず聞く",
    description: "スピーカーをタップするともう一度聞けます。聞こえたものを選びましょう。",
  },
  "activity-syllable-build": {
    title: "単語を組み立てる",
    description: "音節ブロックを順番にタップして単語を作りましょう。できたら「確認」をタップ。",
  },
  "activity-sentence-order": {
    title: "順番に並べる",
    description: "ピースを順番にタップして文を作りましょう。もう一度タップすると戻せます。",
  },
  "activity-culture-card": {
    title: "カルチャーノート",
    description: "韓国での暮らしのちょっとしたヒントです。読んだら「次へ」をタップ。",
  },
};
