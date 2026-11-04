// 일본어 문구표 구획 — 카탈로그 맵 · 표지 컷.
// 번역 초안 — 원어민 검수 필요(ADR-0098).

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
  pending: "近日公開",
  update: "アプリをアップデートすると開けます",
  unavailable: "利用できません",
} as const;

export const catalogUpdateNoticeJa: CatalogUpdateNoticeCopy = {
  title: "ねえねえ、新しい内容があるよ！👀",
  body: "クリアしたエピソードの一部に新しい内容が加わりました。進捗はそのままなのでご安心を。",
  confirm: "いいね、了解！",
  dontShowAgain: "今後表示しない",
  checked: "チェック済み",
  unchecked: "未チェック",
};

export const catalogMapJa: CatalogMapCopy = {
  episodeLabel: (ordinal) => `エピソード${ordinal}.`,
  coverTitle: "エピソード紹介",
  lessonTitle: (ordinal) => `レッスン${ordinal}`,
  finalTitle: "最終テスト",
  cultureTitle: "文化",
  storyTitle: "ストーリー",
  nodeLabel: (label, title) => `${label} ${title}`,
  caption: {
    pending: "近日公開",
    update: "アップデートが必要",
    unavailable: "利用できません",
  },
  unavailableSection: (label, title, kind) => `${label} ${title}、${unavailableTail[kind]}`,
  comingSoon: {
    title: "近日公開",
    body: "次のストーリーを準備中です。",
    label: (episodeLabel) => `${episodeLabel} 近日公開。次のストーリーを準備中です。`,
  },
};

export const catalogCoverJa: CatalogCoverCopy = {
  toggleScript: {
    en: "ローマ字を表示",
    roman: "意味を表示",
  },
  nextCut: (ordinal, total) => `次のシーン、${ordinal} / ${total}`,
  finishCover: "紹介を終える",
  finishEpilogue: "エピソードを終える",
  finishStory: "ストーリーを終える",
  thinking: "考え中",
  episodeStart: "エピソード開始！",
  episodeClear: "エピソードクリア！",
  episodeContinue: "つづく…",
  skipDescription: "エピソード紹介からいつでも見直せます。",
};

export const typingJa: TypingCopy = {
  instruction: "韓国語で文を入力してください。",
  answerField: (typed) => `あなたの回答：${typed}`,
  answerFieldEmpty: "あなたの回答、未入力",
  answerReveal: (answer) => `正解：${answer}`,
};

export const vocabCardJa: VocabCardCopy = {
  instruction: "この単語を覚えましょう。",
  badge: "新しい単語",
  gotIt: "覚えた",
  runLabel: (ordinal, total) => `${total}語中${ordinal}語目`,
  pronunciation: (romanization) => `発音：${romanization}`,
  meaning: (meaning) => `意味：${meaning}`,
};

export const cultureCardJa: CultureCardCopy = {
  instruction: "韓国の暮らしについて知りましょう。",
  eyebrow: "文化",
  tapToFlip: "タップしてめくる",
  flipCard: "カードをめくる",
  nextCard: "次のカード",
  koreanBodyTitle: "韓国語で",
  counter: (position, total) => `${position} / ${total}`,
  pronunciation: (romanization) => `発音：${romanization}`,
  frontPlace: (position, total) => `文化カード ${total}枚中${position}枚目、表。`,
  backPlace: (position, total) => `文化カード ${total}枚中${position}枚目、裏。`,
  flipBackHint: "タップして表に戻す。",
};

export const syllableBuildJa: SyllableBuildCopy = {
  instruction: "音節をタップして単語をつづりましょう。",
  meaning: (meaning) => `意味：${meaning}`,
  placedTile: (text, position, slotCount) => `${text}、${slotCount}つ中${position}番目`,
  wordEmpty: (slotCount) => `あなたの単語、空、${slotCount}音節`,
  word: (word) => `あなたの単語：${word}`,
  usedTile: (text) => `${text}、使用済み`,
};

export const readAloudJa: ReadAloudCopy = {
  matched: (matched, total) => {
    if (matched === total) {
      return total === 1 ? "単語を言えました。" : `${total}語すべて言えました。`;
    }
    // 앞에서부터 이어 맞은 수입니다 — 0이면 "最初の"를 붙이지 않습니다.
    const lead = matched === 0 ? "" : "最初の";
    return `${total}語中、${lead}${matched}語を言えました。`;
  },
  pronunciation: (romanization) => `発音：${romanization}`,
};

export const speakWordJa: SpeakWordCopy = {
  instruction: "絵に合う単語を言いましょう。",
  recognitionUnavailable: "今は音声認識を使えません。「スキップ」をタップして続けてください。",
};

export const pairMatchJa: PairMatchCopy = {
  instruction: "単語をタップしてから、その意味をタップしましょう。",
  progress: (matched, total) => `${matched} / ${total} マッチ`,
  progressLabel: (matched, total) => `${total}組中${matched}組マッチ`,
  selected: (text) => `${text}、選択済み`,
  matched: (text, ordinal, partner) => `${text}、${ordinal}組目、${partner}とマッチ`,
  judged: (text, partner) => `${text}、${partner}とマッチ`,
  answerPair: (word, meaning) => `${word} = ${meaning}`,
  linked: (word, meaning, matched, total) =>
    `マッチ：${word}、${meaning}。${total}組中${matched}組。`,
  unlinked: (text) => `マッチ解除：${text}`,
  missedPairs: (pairs) => `正しい組み合わせ：${pairs}`,
  spokenPair: (word, meaning) => `${word}、${meaning}。`,
};

export const wordChoicePictureJa: WordChoicePictureCopy = {
  picture: (meaning) => `絵：${meaning}`,
  loading: "絵、読み込み中",
  unavailable: (meaning) => `絵を表示できません。意味：${meaning}`,
  unavailableCaption: "絵を表示できません",
  answer: (word, romanization, meaning) =>
    romanization === null
      ? `正解：${word}、${meaning}`
      : `正解：${word}、${romanization}、${meaning}`,
  answerSubline: (romanization, meaning) =>
    romanization === null ? meaning : `${romanization} · ${meaning}`,
};

export const catalogFinalJa: CatalogFinalCopy = {
  turnProgress: (n, total) => `${total}ターン中${n}ターン目`,
  replyLabel: (reply) => `あなたの返事：${reply}`,
  replyEmpty: "あなたの返事、未入力",
  replyHint: (translation) => `言ってみよう：${translation}`,
  correctAnswer: (answer) => `正解：${answer}`,
  answerLabel: "正解",
};

export const catalogStoryFinalJa: CatalogStoryFinalCopy = {
  redo: "やり直す",
  listen: "聞く",
  nextLetter: "次の文字",
  letterLabel: (ordinal, total, state) =>
    `${total}文字中${ordinal}文字目、${state.kind === "written" ? state.syllable : state.kind === "writing" ? "書いています" : "空"}`,
  padLabel: (syllable) => `書くエリア。${syllable}をなぞってください`,
};

export const audioUnavailableJa: AudioUnavailableCopy = {
  label: "音声はまだ利用できません",
};
