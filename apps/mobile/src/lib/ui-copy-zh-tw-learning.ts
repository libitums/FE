// 대만 중국어(번체, zh-TW) 문구표 구획 — 학습 활동(listening ~ lessonComplete) 덩어리(ADR-0185).
// 번역 초안 — 원어민 검수 필요(ADR-0185).

import type { AssembledHintCopy } from "./ui-copy-assembled-hint";
import type {
  AssessmentCopy,
  LessonCompleteCopy,
  ListeningCopy,
  SentenceOrderCopy,
  SpeakingCopy,
  WordChoiceCopy,
} from "./ui-copy-sections.contract";
import type { LearningItemGuideCopy } from "./learning-item-guide.contract";

export const listeningZhTw: ListeningCopy = {
  instruction: "選出這個句子的意思。",
  playback: { pause: "暫停", resume: "繼續播放", play: "播放" },
  playFromStart: "從頭播放",
  slow: "慢速",
  playAgain: "再播一次",
  stop: "停止",
};

export const wordChoiceZhTw: WordChoiceCopy = {
  instruction: "選出合適的單字。",
  culture: {
    sceneInstruction: "你會怎麼說？",
    feedbackTitle: {
      scene: { correct: "回得好！", incorrect: "差一點" },
      question: { correct: "答對了！", incorrect: "差一點" },
    },
  },
};

export const sentenceOrderZhTw: SentenceOrderCopy = {
  instruction: "完成這段對話。",
  placedChip: (text, position) => `${text}，第${position}個位置`,
  dialogueSpeaker: { counterpart: "對方", me: "你" },
  dialogueTurn: (speaker, position, text) => `${speaker}，第${position}句：${text}`,
  dialogueEmptyTurn: (speaker, position) => `${speaker}，第${position}句，空白`,
  dialogueLine: {
    me: (text) => `你說：${text}`,
    counterpart: (text) => `對方說：${text}`,
  },
};

export const speakingZhTw: SpeakingCopy = {
  instruction: "把這個句子大聲唸出來。",
  speak: "說話",
  stopSpeaking: "停止說話",
  listening: "正在聆聽…",
  checking: "正在檢查…",
  tapToStop: "說完後點一下停止",
  tryAgain: "再試一次",
  dictationDisabled:
    "Siri 或聽寫功能已關閉。請到「設定」>「一般」>「鍵盤」開啟「啟用聽寫」，然後再試一次。",
  tapToContinue: "點一下螢幕繼續",
  recognitionUnavailable: "目前無法使用語音辨識。點「略過」繼續。",
  notCaught: "沒有聽清楚。點一下麥克風再試一次。",
  networkRetry: "無法連線到語音辨識。請檢查網路連線後再試一次。",
};

export const assessmentZhTw: AssessmentCopy = {
  activity: "評量",
  verdict: { passed: "通過", failed: "未通過" },
  itemTitle: (ordinal) => `第${ordinal}題`,
  announcement: (verdict) => `評量結果，${verdict === "passed" ? "通過" : "未通過"}`,
};

// 중국어는 복수형이 없어 수를 그대로 붙입니다.
export const lessonCompleteZhTw: LessonCompleteCopy = {
  rewardCoins: (count) => `獎勵，${count}枚錢幣`,
  grade: (grade) => `等級 ${grade}`,
  gradeName: (grade) => grade,
  outcome: { passed: "課程完成", failed: "課程未通過" },
  mistakes: (count) => (count === 0 ? "沒有錯誤" : `錯了${count}題`),
  skippedSuffix: (count) => (count === 0 ? "" : `，略過${count}題`),
  nextLesson: "下一課",
  nextFinal: "期末測驗",
  continueStory: "繼續看故事",
  title: {
    perfect: "完美過關！",
    complete: "課程完成！",
    failed: "課程未通過",
  },
  subtitle: (mistakeCount) =>
    mistakeCount === 0 ? "這一課你一題都沒錯" : `這一課你錯了${mistakeCount}題`,
  streakLabel: (days) => `連續${days}天`,
  rewardLabel: (count) => `+ ${count} 獎勵`,
  tryAgain: "再試一次",
  review: {
    soClose: "就差一點！",
    fixedOf: (fixed, total) => `${total}題錯題中，你改對了${fixed}題`,
    dotsLabel: (fixed, total) => `已改對${fixed}題，共${total}題`,
    neededMore: (count) => `還需要再答對${count}題。再上一次這一課吧——這次會覺得簡單多了。`,
  },
};

// 학습 문항 안내 문구입니다. 닫는 법 줄은 `episodeIntro.guide.continue`를 씁니다.
export const learningItemGuideZhTw: LearningItemGuideCopy = {
  "sentence-order": {
    title: "這次只有一塊",
    description: "平常要把好幾塊依序排好，這次只有一塊。點它，再點「檢查」。",
  },
  "activity-vocab-card": {
    title: "新單字",
    description: "聽聽這個單字，看看它的意思。準備好了就點「下一步」。",
  },
  "activity-word-choice": {
    title: "選一個",
    description: "選出合適的答案，再點「檢查」。",
  },
  "activity-listening": {
    title: "先聽聽看",
    description: "點喇叭可以再聽一次，然後選出你聽到的內容。",
  },
  "activity-syllable-build": {
    title: "拼出單字",
    description: "依序點選音節方塊拼出單字，再點「檢查」。",
  },
  "activity-sentence-order": {
    title: "依序排好",
    description: "依序點選詞塊組成句子。再點一次詞塊就能把它拿回來。",
  },
  "activity-culture-card": {
    title: "文化小知識",
    description: "關於韓國生活的小提示。讀完後點「下一步」。",
  },
};

// 조립 문항 힌트 문구(ADR-0153) — 다섯 언어 표(`ui-copy-assembled-hint.ts`)와 같은 열쇠입니다.
export const assembledHintZhTw: AssembledHintCopy = {
  button: "提示",
  title: "提示",
  close: "關閉",
  listen: "聽答案",
  show: "看答案",
  shown: (answer) => `已顯示答案：${answer}`,
};
