// 추천 친구 줄 · 프로필 시트 · 친구 찾기 문구(ja, ADR-0162).

import type { SuggestedFriendsCopy } from "../screens/messenger-chat/suggested-friends.contract";

export const messengerChatSuggestedJa: SuggestedFriendsCopy = {
  language: "ja",
  rowTitle: "新しい友だちに会おう",
  seeAll: "すべて見る",
  seeAllLabel: "友だちをすべて見る",
  earlyTag: (price) => `先行 · ${price}`,
  newLabel: (name) => `${name}、新しい友だち`,
  lockedLabel: (name, episode) => `${name}、エピソード${episode}で出会えます`,
  earlyLabel: (name, episode, price) =>
    `${name}、エピソード${episode}で出会えます。${price}枚で今すぐチャットもできます`,
  sheetLabel: (name) => `${name}、プロフィール`,
  newBadge: "NEW",
  startChatting: "チャットを始める",
  notNow: "今はしない",
  meetIn: (episode) => `エピソード${episode}で出会えます`,
  lockedInfo: (name) =>
    `ストーリーを終えると連絡先を交換できます。${name}から先にメッセージが届きます。`,
  chatNow: (price) => `今すぐチャット · ${price}`,
  earlyButtonLabel: (price, left) =>
    `${price}枚で今すぐチャット、期間限定${left === null ? "" : `、残り${left.days}日${left.hours}時間`}`,
  launchSpecial: (name) => `リリース記念 · ${name}に先に会える`,
  limited: "期間限定",
  limitedUntil: (days, hours) => `期間限定 · 残り${days}日${hours}時間`,
  added: (name) => `${name}をチャットに追加しました`,
  addFailed: (name) => `${name}を追加できませんでした。もう一度お試しください。`,
  directory: {
    title: "友だちを探す",
    back: "戻る",
    all: "すべて",
    fromStory: "ストーリーから",
    sectionStory: "ストーリーで出会う人",
    sectionNew: "新しい友だち",
    chat: "チャット",
    chatLabel: (name) => `${name}とチャット`,
    added: "追加済み",
    addedLabel: (name) => `${name}、チャットに追加済み`,
    earlyLabel: (name, price) => `${price}枚で${name}に先に会う`,
    locked: (episode) => `Ep. ${episode}`,
    lockedLabel: (name, episode) => `${name}、エピソード${episode}で出会えます`,
    meetIn: (episode) => `エピソード${episode}で出会えます`,
    moreComing: "新しい友だちが続々登場予定",
    chipLabel: (label, selected) => (selected ? `${label}、選択中` : label),
  },
};
