// 추천 친구 줄 · 프로필 시트 · 친구 찾기 문구 대만 중국어(번체, zh-TW) 덩어리(ADR-0185).
// 번역 초안 — 원어민 검수 필요(ADR-0185).

import type { SuggestedFriendsCopy } from "../screens/messenger-chat/suggested-friends.contract";

export const messengerChatSuggestedZhTw: SuggestedFriendsCopy = {
  language: "zh-TW",
  rowTitle: "認識新朋友",
  seeAll: "查看全部",
  seeAllLabel: "查看所有朋友",
  newLabel: (name) => `${name}，新朋友`,
  lockedLabel: (name, episode) => `${name}，將在第${episode}集認識`,
  earlyLabel: (name, episode, price) =>
    `${name}，將在第${episode}集認識，或用${price}枚錢幣立即聊天`,
  sheetLabel: (name) => `${name}，個人檔案`,
  newBadge: "新",
  startChatting: "開始聊天",
  notNow: "以後再說",
  meetIn: (episode) => `你會在第${episode}集認識`,
  lockedInfo: (name) => `完成故事就能交換電話號碼 — ${name} 會先傳訊息給你。`,
  chatNow: (price) => `立即聊天 · ${price}`,
  earlyButtonLabel: (price, left) =>
    `用${price}枚錢幣立即聊天，限時優惠${left === null ? "" : `，剩下${left.days}天${left.hours}小時`}`,
  launchSpecial: (name) => `上線特惠 · 搶先認識 ${name}`,
  limited: "限時",
  limitedUntil: (days, hours) => `限時 · ${days}天${hours}小時`,
  added: (name) => `已把 ${name} 加入聊天`,
  addFailed: (name) => `無法加入 ${name}，請再試一次。`,
  adultAck: {
    title: (name) => `想和 ${name} 更親近嗎？`,
    body: (gender) =>
      gender === null
        ? "聊天可以更溫暖、更貼近彼此，就像和正在慢慢認識的人一樣。"
        : `${gender === "female" ? "她" : "他"}可以對你更溫暖、更貼心，就像正在慢慢認識的人一樣。`,
    safe: "永遠親切而尊重，絕不會有露骨的內容。",
    casual: (gender) =>
      `之後想輕鬆一點？${gender === null ? "說一聲就好。" : `跟${gender === "female" ? "她" : "他"}說一聲就好。`}`,
    confirm: "好啊",
    decline: "先當朋友就好",
  },
  directory: {
    title: "找朋友",
    back: "返回",
    all: "全部",
    fromStory: "來自你的故事",
    sectionStory: "來自你的故事",
    sectionNew: "新朋友",
    chat: "聊天",
    chatLabel: (name) => `和 ${name} 聊天`,
    added: "已加入",
    addedLabel: (name) => `${name}，已在你的聊天中`,
    earlyLabel: (name, price) => `用${price}枚錢幣搶先認識 ${name}`,
    locked: (episode) => `第${episode}集`,
    lockedLabel: (name, episode) => `${name}，將在第${episode}集認識`,
    meetIn: (episode) => `在第${episode}集認識`,
    moreComing: "更多朋友即將到來",
    chipLabel: (label, selected) => (selected ? `${label}，已選取` : label),
  },
};
