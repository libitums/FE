// 앨범 · 사진 속 내 모습 · 다시 만들기 문구의 대만 중국어(번체, zh-TW) 덩어리(ADR-0185).
// 번역 초안 — 원어민 검수 필요(ADR-0185).

import type { ChatAlbumCopy } from "../screens/messenger-chat/chat-album.contract";

export const messengerChatAlbumZhTw: ChatAlbumCopy = {
  sidebarRow: "相簿",
  sidebarDescription: "照片和語音訊息",
  title: (name) => `${name} 的相簿`,
  back: "返回",
  tabs: { all: "全部", photos: "照片", voice: "語音" },
  day: (day) =>
    day.kind === "today"
      ? "今天"
      : day.kind === "yesterday"
        ? "昨天"
        : `${day.month}月${day.day}日`,
  drawing: "正在繪製…",
  recording: "正在錄音…",
  versions: (count) => `${count}個版本`,
  version: (index, count) => `第${index}個版本，共${count}個`,
  pastChat: "來自先前的聊天",
  keepNote: "即使刪除聊天，照片和語音訊息仍會保留在這裡。",
  empty: (name) => `${name} 傳來的照片和語音訊息會顯示在這裡。`,
  loadFailed: "無法載入相簿。",
  tryAgain: "再試一次",
  more: "顯示更多",
  photoLabel: (name, line) => (line === "" ? `${name} 傳來的照片` : `${name} 傳來的照片，${line}`),
  voiceLabel: (name, line) =>
    line === "" ? `${name} 傳來的語音訊息` : `${name} 傳來的語音訊息，${line}`,
  viewerTitle: (name, day) => `${name} · ${day}`,
  fromChat: "來自你的聊天",
  close: "關閉",
  redraw: (price) => `重畫 · ${price}`,
  recordAgain: (price) => `重錄 · ${price}`,
  play: "播放",
  pause: "暫停",
  redrawTitle: "要重畫這張快照嗎？",
  redrawBody: (name) => `${name} 會重新畫下這個時刻。兩張照片都會保留在你的相簿中。`,
  recordTitle: "要重新錄製嗎？",
  recordBody: (name) => `${name} 會用新的一次錄音再說一遍這句話。`,
  confirmRedraw: (price) => `用 ${price} Yeopjeon 重畫`,
  confirmRecord: (price) => `用 ${price} Yeopjeon 重錄`,
  balance: (coins) => `你有 ${coins} Yeopjeon`,
  getCoins: "取得 Yeopjeon",
  cancel: "取消",
  refused: (notice, media, name) => {
    const photo = media === "photo";
    switch (notice) {
      case "no-coins":
        return "你的 Yeopjeon 不足。";
      case "busy":
        return photo ? `${name} 還在畫另一張照片。` : `${name} 還在錄另一則語音訊息。`;
      case "limit":
        return "你已達到今天的上限，請稍後再試。";
      case "not-eligible":
        return photo ? "這張照片無法重畫。" : "這則語音訊息無法重錄。";
      default:
        return "無法送出你的請求，請再試一次。";
    }
  },
  selfSection: "關於你",
  selfRow: "快照中的你",
  selfTitle: "快照中的你",
  selfBody: "角色傳照片時，你可能會出現在照片裡。我們絕不會畫出你的臉。",
  selfAsk: "你想以什麼樣子出現？",
  selfAskNote: "一律是背影，絕不畫臉。之後可在 設定 › 聊天 中變更。",
  selfOptions: {
    female: { title: "女性", body: "背影" },
    male: { title: "男性", body: "背影" },
    hidden: { title: "只有手", body: "只出現你的手或肩膀" },
  },
  save: "儲存",
};
