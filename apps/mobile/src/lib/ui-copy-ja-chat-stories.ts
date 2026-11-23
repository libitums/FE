// 친구 스토리 줄 · 보기 · 대화 인용 문구(ja, ADR-0177).

import type { FriendStoriesCopy } from "../screens/messenger-chat/friend-stories.contract";

export const messengerChatStoriesJa: FriendStoriesCopy = {
  language: "ja",
  // 낭독 조각 잇기 — 언어마다 구분자(감사 다국어 minor 9).
  listSeparator: "、",
  labelSeparator: "：",
  rowTitle: "ストーリー",
  watchAll: "すべて見る",
  watchAllLabel: "ストーリーをすべて見る",
  age: (age) =>
    age.unit === "now" ? "たった今" : age.unit === "m" ? `${age.value}分` : `${age.value}時間`,
  seen: "既読",
  newBadge: "NEW",
  friendLabel: (name, age, seen) => `${name}のストーリー、${age}${seen ? "、既読" : "、新着"}`,
  unmetLabel: (name) => `${name}のストーリー、新しい友だち`,
  findFriends: "友だちを探す",
  findFriendsLabel: "友だちを探す",
  listPreview: (line) => `新しいストーリー · ${line}`,
  listRowLabel: (name, line) => `${name}、新しいストーリー：${line}。ストーリーを開きます`,
  viewer: {
    label: (name) => `${name}のストーリー`,
    progress: (index, count) => `ストーリー ${count}件中${index}件目`,
    pause: "一時停止",
    play: "再生",
    close: "閉じる",
    previous: "前のストーリー",
    next: "次のストーリー",
    photoLabel: (name) => `${name}の写真`,
    saveWord: (ko, meaning) => `${ko} · ${meaning} — 単語を保存`,
    saveWordLabel: (ko, meaning) => `${ko}（${meaning}）を単語帳に保存`,
    saved: (ko) => `${ko}を単語帳に保存しました`,
    freeReply: "最初の返信は無料",
    replyPlaceholder: (name) => `${name}に返信…`,
    replyChipLabel: (text) => `返信：${text}`,
    newFriend: "新しい友だち",
    addAndReply: "友だちに追加して返信",
    seeHowToMeet: "出会い方を見る",
  },
  reply: {
    caption: (name) => `${name}のストーリーに返信しました`,
    storyMeta: (age) => (age === null ? "ストーリー" : `ストーリー · ${age}`),
    replying: (name) => `${name}のストーリーに返信中`,
    removeQuote: "引用を外す",
  },
};
