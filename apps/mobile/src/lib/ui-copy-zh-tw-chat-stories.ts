// 친구 스토리 줄 · 보기 · 대화 인용 문구 대만 중국어(번체, zh-TW) 덩어리(ADR-0185).
// 번역 초안 — 원어민 검수 필요(ADR-0185).

import type { FriendStoriesCopy } from "../screens/messenger-chat/friend-stories.contract";

export const messengerChatStoriesZhTw: FriendStoriesCopy = {
  language: "zh-TW",
  // 낭독 조각 잇기 — 언어마다 구분자(감사 다국어 minor 9).
  listSeparator: "、",
  labelSeparator: "：",
  rowTitle: "限時動態",
  watchAll: "全部觀看",
  watchAllLabel: "觀看所有限時動態",
  age: (age) =>
    age.unit === "now" ? "剛剛" : age.unit === "m" ? `${age.value}分鐘` : `${age.value}小時`,
  seen: "已看過",
  newBadge: "新",
  friendLabel: (name, age, seen) => `${name} 的限時動態，${age}${seen ? "，已看過" : "，新"}`,
  unmetLabel: (name) => `${name} 的限時動態，新朋友`,
  findFriends: "找朋友",
  findFriendsLabel: "找朋友",
  listPreview: (line) => `新的限時動態 · ${line}`,
  listRowLabel: (name, line) => `${name}，新的限時動態：${line}。開啟限時動態`,
  viewer: {
    label: (name) => `${name} 的限時動態`,
    progress: (index, count) => `第${index}則，共${count}則`,
    pause: "暫停",
    play: "播放",
    close: "關閉",
    previous: "上一則限時動態",
    next: "下一則限時動態",
    photoLabel: (name) => `${name} 傳來的照片`,
    saveWord: (ko, meaning) => `${ko} · ${meaning} — 收藏單字`,
    saveWordLabel: (ko, meaning) => `把 ${ko}，${meaning}，收藏到我的單字`,
    saved: (ko) => `已把 ${ko} 收藏到我的單字`,
    freeReply: "第一次回覆免費",
    replyPlaceholder: (name) => `回覆 ${name}…`,
    replyChipLabel: (text) => `回覆：${text}`,
    send: "傳送",
    sent: "已傳送",
    sentLabel: (name) => `已傳送給${name}`,
    openChat: "開啟聊天",
    sendFailed: "無法傳送，請再試一次。",
    coinsShort: "錢幣不足",
    newFriend: "新朋友",
    addAndReply: "加為朋友並回覆",
    profile: (name) => `${name} 的個人檔案`,
  },
  reply: {
    caption: (name) => `你回覆了 ${name} 的限時動態`,
    storyMeta: (age) => (age === null ? "限時動態" : `限時動態 · ${age}`),
    replying: (name) => `正在回覆 ${name} 的限時動態`,
    removeQuote: "移除引用",
  },
};
