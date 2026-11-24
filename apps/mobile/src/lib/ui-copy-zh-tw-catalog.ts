// 대만 중국어(번체, zh-TW) 문구표 구획 — 카탈로그 맵 · 표지 컷 덩어리(ADR-0185).
// 번역 초안 — 원어민 검수 필요(ADR-0185).

import type { AudioUnavailableCopy } from "../components/audio-unavailable.contract";
import type { CatalogCoverCopy } from "../screens/catalog-cover/catalog-cover.contract";
import type { CatalogFinalCopy } from "../screens/catalog-final/catalog-final.contract";
import type { CatalogStoryFinalCopy } from "../screens/catalog-story-final/catalog-story-final.contract";
import type { CatalogMapCopy } from "../screens/journey-map/catalog-map.contract";
import type { CatalogUpdateNoticeCopy } from "../screens/catalog-update/catalog-update-notice.contract";
import type { CultureCardCopy } from "../screens/culture-card/culture-card.contract";
import type { PairMatchCopy } from "../screens/pair-match/pair-match.contract";
import type { ReadAloudCopy } from "../screens/read-aloud/read-aloud.contract";
import type { SpeakWordCopy } from "../screens/speak-word/speak-word.contract";
import type { SyllableBuildCopy } from "../screens/syllable-build/syllable-build.contract";
import type { TypingCopy } from "../screens/typing/typing.contract";
import type { VocabCardCopy } from "../screens/vocab-card/vocab-card.contract";
import type { WordChoicePictureCopy } from "../screens/word-choice/word-choice-picture";

const unavailableTail = {
  pending: "即將推出",
  update: "請更新 App 後開啟",
  unavailable: "無法使用",
} as const;

export const catalogUpdateNoticeZhTw: CatalogUpdateNoticeCopy = {
  title: "有新東西囉！👀",
  body: "你完成過的幾集加入了新內容。別擔心，你的進度都還在。",
  confirm: "好，知道了",
  dontShowAgain: "不再顯示",
  checked: "已勾選",
  unchecked: "未勾選",
};

export const catalogMapZhTw: CatalogMapCopy = {
  episodeLabel: (ordinal) => `第${ordinal}集`,
  coverTitle: "序章",
  lessonTitle: (ordinal) => `第${ordinal}課`,
  sheetHeading: (unit, title) => `${unit}：「${title}」`,
  finalTitle: "期末測驗",
  cultureTitle: "文化",
  storyTitle: "故事",
  nodeLabel: (label, title) => `${label} ${title}`,
  caption: {
    pending: "即將推出",
    update: "需要更新",
    unavailable: "無法使用",
  },
  unavailableSection: (label, title, kind) => `${label} ${title}，${unavailableTail[kind]}`,
  comingSoon: {
    title: "即將推出",
    body: "我們正在準備下一個故事。",
    label: (episodeLabel) => `${episodeLabel} 即將推出。我們正在準備下一個故事。`,
    checkedToday: "今天已檢查",
    checkedDaysAgo: (d) => (d === 1 ? "昨天已檢查" : `${d}天前已檢查`),
    staleTitle: "可能有新故事在等你",
    staleBody: "請連上網路來檢查有沒有新的集數。",
    checkNew: "檢查新故事",
  },
  coverDownload: {
    gettingReady: (percent) => `準備中 · ${percent}%`,
    tapToDownload: (size) => (size === null ? "點一下即可下載" : `點一下即可下載 · ${size}`),
  },
};

export const catalogCoverZhTw: CatalogCoverCopy = {
  toggleScript: {
    en: "顯示羅馬拼音",
    roman: "顯示中文",
  },
  nextCut: (ordinal, total) => `下一幕，第${ordinal}幕，共${total}幕`,
  finishCover: "結束序章",
  finishEpilogue: "結束這一集",
  finishStory: "結束故事",
  thinking: "思考中",
  episodeStart: "新的一集開始！",
  episodeClear: "這一集完成！",
  episodeContinue: "未完待續…",
  skipDescription: "之後隨時都能從這一集的序章再看一次。",
};

export const typingZhTw: TypingCopy = {
  instruction: "用韓文打出這個句子。",
  answerField: (typed) => `你的答案：${typed}`,
  answerFieldEmpty: "你的答案，空白",
  answerReveal: (answer) => `答案：${answer}`,
};

export const vocabCardZhTw: VocabCardCopy = {
  instruction: "學學這個單字。",
  badge: "新單字",
  gotIt: "記住了",
  runLabel: (ordinal, total) => `第${ordinal}個單字，共${total}個`,
  pronunciation: (romanization) => `發音：${romanization}`,
  meaning: (meaning) => `意思：${meaning}`,
};

export const cultureCardZhTw: CultureCardCopy = {
  instruction: "認識韓國的生活。",
  eyebrow: "文化",
  tapToFlip: "點一下翻面",
  flipCard: "翻轉卡片",
  nextCard: "下一張卡片",
  koreanBodyTitle: "韓文原文",
  counter: (position, total) => `${position} / ${total}`,
  pronunciation: (romanization) => `發音：${romanization}`,
  frontPlace: (position, total) => `文化卡片第${position}張，共${total}張，正面。`,
  backPlace: (position, total) => `文化卡片第${position}張，共${total}張，背面。`,
  flipBackHint: "點一下翻回來。",
};

// 중국어는 복수형이 없어 음절 수를 그대로 붙입니다.
export const syllableBuildZhTw: SyllableBuildCopy = {
  instruction: "點選音節，拼出這個單字。",
  meaning: (meaning) => `意思：${meaning}`,
  placedTile: (text, position, slotCount) => `${text}，第${position}個位置，共${slotCount}個`,
  wordEmpty: (slotCount) => `你的單字，空白，${slotCount}個音節`,
  word: (word) => `你的單字：${word}`,
  usedTile: (text) => `${text}，已使用`,
};

export const readAloudZhTw: ReadAloudCopy = {
  matched: (matched, total) => {
    if (matched === total) {
      return total === 1 ? "你說對了這個單字。" : `${total}個單字你全都說對了。`;
    }
    // 앞에서부터 이어 맞은 수입니다 — 0이면 "前"을 붙이지 않습니다.
    return matched === 0
      ? `${total}個單字中，你說對了0個。`
      : `${total}個單字中，你說對了前${matched}個。`;
  },
  pronunciation: (romanization) => `發音：${romanization}`,
};

export const speakWordZhTw: SpeakWordCopy = {
  instruction: "說出圖片對應的單字。",
  recognitionUnavailable: "目前無法使用語音辨識。點「略過」繼續。",
};

export const pairMatchZhTw: PairMatchCopy = {
  instruction: "先點一個單字，再點它的意思。",
  progress: (matched, total) => `已配對 ${matched} / ${total}`,
  progressLabel: (matched, total) => `已配對${matched}組，共${total}組`,
  selected: (text) => `${text}，已選取`,
  matched: (text, ordinal, partner) => `${text}，第${ordinal}組，已和${partner}配對`,
  judged: (text, partner) => `${text}，已和${partner}配對`,
  answerPair: (word, meaning) => `${word} = ${meaning}`,
  linked: (word, meaning, matched, total) =>
    `已配對：${word}，${meaning}。第${matched}組，共${total}組。`,
  unlinked: (text) => `取消配對：${text}`,
  missedPairs: (pairs) => `正確的配對：${pairs}`,
  spokenPair: (word, meaning) => `${word}，${meaning}。`,
};

export const wordChoicePictureZhTw: WordChoicePictureCopy = {
  picture: (meaning) => `圖片：${meaning}`,
  loading: "圖片，載入中",
  unavailable: (meaning) => `無法顯示圖片。意思：${meaning}`,
  unavailableCaption: "無法顯示圖片",
  answer: (word, romanization, meaning) =>
    romanization === null
      ? `答案：${word}，${meaning}`
      : `答案：${word}，${romanization}，${meaning}`,
  answerSubline: (romanization, meaning) =>
    romanization === null ? meaning : `${romanization} · ${meaning}`,
};

export const catalogFinalZhTw: CatalogFinalCopy = {
  turnProgress: (n, total) => `第${n}回合，共${total}回合`,
  replyLabel: (reply) => `你的回覆：${reply}`,
  replyEmpty: "你的回覆，空白",
  replyHint: (translation) => `試著說：${translation}`,
  correctAnswer: (answer) => `答案：${answer}`,
  answerLabel: "答案",
};

export const catalogStoryFinalZhTw: CatalogStoryFinalCopy = {
  redo: "重寫",
  listen: "聽聽看",
  nextLetter: "下一個字",
  letterLabel: (ordinal, total, state) =>
    `第${ordinal}個字，共${total}個，${state.kind === "written" ? state.syllable : state.kind === "writing" ? "書寫中" : "空白"}`,
  padLabel: (syllable) => `書寫區。照著寫 ${syllable}`,
};

export const audioUnavailableZhTw: AudioUnavailableCopy = {
  label: "目前還沒有音訊",
};
