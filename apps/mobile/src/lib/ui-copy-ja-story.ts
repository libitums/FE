// 일본어 문구표 구획 — 이야기 · 롤플레이(episodeIntro ~ roleplay).
// 번역 초안 — 원어민 검수 필요(ADR-0098).

import type {
  EpisodeIntroCopy,
  MessengerCopy,
  RoleplayCopy,
  VisualNovelCopy,
} from "./ui-copy-sections.contract";
import type { StoryCallCopy } from "../screens/story-call/story-call.contract";
import type { StoryIntroCopy } from "../screens/story-intro/story-intro.contract";
import type { StoryMessengerCopy } from "../screens/story-messenger/story-messenger.contract";

export const episodeIntroJa: EpisodeIntroCopy = {
  guide: {
    map: "タップしてレッスンを始めよう！",
    continue: "どこかをタップして続ける",
  },
  skipDialog: {
    title: "ストーリーをスキップしますか？",
    description: "スキップすると、このエピソードのストーリーは再表示されません。",
    skip: "スキップ",
    keepWatching: "見続ける",
  },
};

export const messengerJa: MessengerCopy = {
  keyboard: {
    shift: "シフト",
    shiftOn: "シフト、オン",
    backspace: "削除",
    comma: "コンマ",
    period: "ピリオド",
    space: "スペース",
    questionMark: "疑問符",
  },
};

export const visualNovelJa: VisualNovelCopy = {
  sceneProgress: (ordinal, total) => `シーン ${ordinal} / ${total}`,
};

export const roleplayJa: RoleplayCopy = {
  title: "ロールプレイ",
  form: { story: "ロールプレイ" },
  viewAll: "すべて見る",
  viewAllLabel: (sectionLabel) => `すべて見る、${sectionLabel}`,
  plus: "Plus",
  plusTagline: "似た場面を練習",
  plusSectionLabel: (sectionLabel) =>
    `${sectionLabel} Plusロールプレイ、このエピソードに似た場面を練習`,
  plusDialogTitle: "Plusロールプレイ",
  lockedSection: (name) =>
    `${name}、ロック中、ジャーニーでこのエピソードを終えるとロックが解除されます`,
  premiumLock: { episode: "ロック中", payment: "Plus限定" },
  premiumNotice: (itemTitle) =>
    `「${itemTitle}」はPlusロールプレイです。Plusはまだご利用いただけません。`,
};

export const storyMessengerJa: StoryMessengerCopy = {
  back: "マップに戻る",
  typing: (speaker) => `${speaker}が入力中`,
  replyTitle: "どう答えますか？",
  closeReply: "閉じる",
  send: "送信",
  composerPlaceholder: "メッセージ",
  finish: "ストーリーを終える",
};

export const storyIntroJa: StoryIntroCopy = {
  overline: (ordinal) => `ストーリー · エピソード${ordinal}`,
  back: "マップに戻る",
  skip: "スキップ",
  start: "スタート",
  skipDialog: {
    title: "ストーリーをスキップしますか？",
    description: "マップからいつでも見直せます。",
    skip: "スキップ",
    keepWatching: "見続ける",
  },
};

export const storyCallJa: StoryCallCopy = {
  incoming: "着信",
  answer: "応答",
  connecting: "接続中…",
  callEnded: (clock) => `通話終了 · ${clock}`,
  me: "自分",
  mute: "消音",
  speaker: "スピーカー",
  end: "終了",
  back: "マップに戻る",
  finish: "ストーリーを終える",
};
