// 내 스토리 문구(zh-TW, ADR-0194 · ADR-0191). 「스토리」는 친구 스토리 표(`ui-copy-zh-tw-chat-stories.ts`)와 같은 「限時動態」.
// 번역 초안 — 원어민 검수 필요(ADR-0185).

import type { MyStoriesCopy } from "../screens/messenger-chat/my-stories-copy.contract";
import { storyPhotoZhTw } from "./ui-copy-story-photo-2";

const replies = (count: number) => `${count}則回覆`;

const LIVE = "公開中";

export const myStoriesZhTw: MyStoriesCopy = {
  language: "zh-TW",
  row: {
    create: "新增",
    createLabel: "新增限時動態",
    mine: "你的限時動態",
    mineLabel: (count, unseen) => `你的限時動態，${replies(count)}${unseen ? "，有新回覆" : ""}`,
    next: "下一則",
    nextLabel: (time) => `下一則限時動態${time}開放`,
  },
  guide: {
    title: "分享一個韓文單字",
    body: "這裡的朋友會回覆你——每一則限時動態都是一次小小的韓文練習。",
    steps: [
      { title: "選一個單字", body: "從你收藏的單字中挑選。" },
      { title: "朋友會在一小時內回覆", body: "回覆會出現在每位朋友的聊天中。" },
      {
        title: "只有你在 duru 的朋友看得到",
        body: "其他人永遠看不到。隨時可在設定 › 我的限時動態中刪除。",
      },
    ],
    start: "建立我的第一則限時動態",
    later: "稍後再說",
    stepLabel: (n, title, body) => `${n}. ${title}。${body}`,
  },
  composer: {
    title: "新的限時動態",
    close: "關閉",
    emptyWords: "還沒有收藏的單字。課程中學到的單字會出現在這裡。",
    choiceLabel: (ko, meaning, selected) => `${ko}，${meaning}${selected ? "，已選取" : ""}`,
    posting: "分享中…",
    dailyLimit: "今天分享的限時動態已達上限，明天再試試。",
    windowUsed: (time) =>
      time === null
        ? "這個時段你已經分享過限時動態了。"
        : `這個時段你已經分享過限時動態了。下一則${time}開放。`,
    failed: "無法分享限時動態，請再試一次。",
    checkLimit: "今天的嘗試次數已用完，明天再試試。",
    invalid: "無法分享這則限時動態，試著修改看看。",
  },
  viewer: {
    yourStory: "你的限時動態",
    close: "關閉",
    options: "限時動態選項",
    delete: "刪除限時動態",
    replied: (count) => (count === 0 ? "還沒有回覆" : `${count}位朋友回覆了`),
    seenBy: (count) => `${count}人看過`,
    seenByLabel: (count) => `${count}位朋友看過`,
    openChat: "開啟聊天",
    openChatLabel: (name) => `開啟和 ${name} 的聊天`,
    saved: "回覆會保存在每位朋友的聊天中。",
    waiting: "朋友通常會在一小時內回覆。",
    waitingBody: "有回覆時會通知你。回覆會出現在這裡和每位朋友的聊天中。",
    noFriendsTitle: "加朋友就能收到回覆",
    noFriendsBody: "先和某個人聊聊——之後他們就會看到你的限時動態。",
    findFriends: "找朋友",
    hidden: "朋友在24小時內看得到這則。現在只有你看得到。",
    reactionLabel: (name, text, meaning) => `${name}：${text}${meaning ? `。${meaning}` : ""}`,
    swipeUp: "向上滑動查看回覆",
    noViews: "還沒有人看過",
    showReplies: "查看回覆",
  },
  window: {
    title: (slot) =>
      `你已分享${slot === "morning" ? "今天早上" : slot === "day" ? "今天下午" : "今晚"}的限時動態`,
    body: (time) => `早上、下午、晚上各能分享一則限時動態。下一則${time}開放。`,
    slot: (slot) => (slot === "morning" ? "早上" : slot === "day" ? "下午" : "晚上"),
    range: (start, end) => `${start}–${end}`,
    time: (hour, minute) => `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    shared: "已分享",
    missed: "已錯過",
    open: "現在開放",
    opens: (time) => `${time}開放`,
    slotLabel: (slot, range, state) => `${slot}，${range}，${state}`,
    ok: "知道了",
    close: "關閉",
  },
  photo: storyPhotoZhTw,
  start: {
    title: "新的限時動態",
    close: "關閉",
    camera: "相機",
    background: "背景",
    recent: "最近的照片",
  },
  editor: {
    label: "編輯限時動態",
    back: "返回",
    colors: "背景顏色",
    color: (background) =>
      background === "orange"
        ? "橘色"
        : background === "green"
          ? "綠色"
          : background === "blue"
            ? "藍色"
            : "紫色",
    colorLabel: (name, on) => `${name}${on ? "，已選取" : ""}`,
    text: "文字",
    words: "單字",
    share: "分享給朋友",
    posting: "分享中…",
    hintOne: "放上一個單字就能分享。",
    hintOneText: "加一個單字或寫一句話，就能分享。",
    hintMove: "拖曳移動，用兩指縮放。",
    stickerLabel: (ko, meaning) => `${ko}，${meaning}`,
    remove: (ko) => `移除 ${ko}`,
    textBlocked: "這段文字無法分享，請換個說法。",
  },
  textEntry: {
    label: "限時動態文字，韓文或英文",
    help: "韓文或英文都可以，我們會幫忙",
    done: "完成",
    colors: "文字顏色",
    color: (textColor) =>
      textColor === "brown"
        ? "咖啡色"
        : textColor === "black"
          ? "黑色"
          : textColor === "white"
            ? "白色"
            : "橘色",
    colorLabel: (name, on) => `${name}${on ? "，已選取" : ""}`,
    editLabel: (ko) => `編輯文字：${ko}`,
  },
  add: {
    title: "加一個單字",
    hint: "點一個單字放上去。每則最多 8 個。",
    hintOne: "點一個單字放上去。",
  },
  quiz: {
    free: "回答測驗免費",
    freeAnswer: "免費 · 測驗回答",
    lastTry: "免費 · 最後一次機會",
    correct: (name) => `答對了！你和 ${name} 更親近了`,
  },
  remove: {
    title: "要刪除這則限時動態嗎？",
    body: (count) =>
      `你的卡片和上面的${replies(count)}會被移除。聊天中的訊息會保留，並標示「已刪除的限時動態」。此動作無法復原。`,
    allTitle: "要刪除所有限時動態嗎？",
    allBody:
      "你所有的限時動態和上面的回覆都會被移除。聊天中的訊息會保留，並標示「已刪除的限時動態」。此動作無法復原。",
    confirm: "刪除",
    cancel: "取消",
    failed: "無法刪除，請再試一次。",
  },
  archive: {
    entryTitle: "我的限時動態",
    entryDescription: "你分享過的單字和卡片",
    title: "我的限時動態",
    back: "回到設定",
    keep: "24小時後保留我的限時動態",
    keepBody: "朋友能看到限時動態24小時。這個封存只有你看得到。",
    count: (count) => `${count}則限時動態`,
    newest: "最新的在前",
    live: LIVE,
    tileMeta: (date, count) => `${date} · ${replies(count)}`,
    tileLabel: (ko, meaning, date, count, live) =>
      `${ko}，${meaning}，${date}，${replies(count)}${live ? `，${LIVE}` : ""}`,
    deleteOne: (date) => `刪除${date}的限時動態`,
    deleteToday: "刪除今天的限時動態",
    deleteAll: "刪除所有限時動態",
    deleteAllNote: "你的卡片和上面的回覆會從我們的伺服器刪除。",
    empty: "還沒有限時動態。點聊天列表上方的＋分享一個單字。",
    today: "今天",
    date: (month, day) => `${month}月${day}日`,
  },
  quote: {
    mine: "你針對自己的限時動態回覆了",
    reacted: "回覆了你的限時動態",
    deleted: "已刪除的限時動態",
    deletedLabel: "回覆已刪除的限時動態",
    openStory: "打開限時動態",
    ended: "已結束",
    endedTitle: "這則限時動態已結束",
  },
};
