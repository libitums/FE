// 앨범 · 사진 속 내 모습 · 다시 만들기 문구(ja, ADR-0150).

import type { ChatAlbumCopy } from "../screens/messenger-chat/chat-album.contract";

export const messengerChatAlbumJa: ChatAlbumCopy = {
  sidebarRow: "アルバム",
  sidebarDescription: "写真とボイスメッセージ",
  title: (name) => `${name}のアルバム`,
  back: "戻る",
  tabs: { all: "すべて", photos: "写真", voice: "ボイス" },
  day: (day) =>
    day.kind === "today"
      ? "今日"
      : day.kind === "yesterday"
        ? "昨日"
        : `${day.month}月${day.day}日`,
  drawing: "描いています…",
  recording: "録音しています…",
  versions: (count) => `${count}枚`,
  version: (index, count) => `${count}枚中${index}枚目`,
  pastChat: "前のチャットから",
  keepNote: "チャットを削除しても、写真とボイスメッセージはここに残ります。",
  empty: (name) => `${name}からの写真とボイスメッセージはここに表示されます。`,
  loadFailed: "アルバムを読み込めませんでした。",
  tryAgain: "もう一度",
  more: "もっと見る",
  photoLabel: (name, line) => (line === "" ? `${name}からの写真` : `${name}からの写真、${line}`),
  voiceLabel: (name, line) =>
    line === "" ? `${name}からのボイスメッセージ` : `${name}からのボイスメッセージ、${line}`,
  viewerTitle: (name, day) => `${name} · ${day}`,
  fromChat: "チャットより",
  close: "閉じる",
  redraw: (price) => `描き直す · ${price}`,
  recordAgain: (price) => `録り直す · ${price}`,
  play: "再生",
  pause: "一時停止",
  redrawTitle: "この写真を描き直しますか？",
  redrawBody: (name) => `${name}がこの場面をもう一度描きます。アルバムには両方の写真が残ります。`,
  recordTitle: "録り直しますか？",
  recordBody: (name) => `${name}がこのセリフを新しく録り直します。`,
  confirmRedraw: (price) => `${price} Yeopjeonで描き直す`,
  confirmRecord: (price) => `${price} Yeopjeonで録り直す`,
  balance: (coins) => `${coins} Yeopjeon持っています`,
  getCoins: "Yeopjeonを手に入れる",
  cancel: "キャンセル",
  refused: (notice, media, name) => {
    const photo = media === "photo";
    switch (notice) {
      case "no-coins":
        return "Yeopjeonが足りません。";
      case "busy":
        return photo
          ? `${name}は別の写真を描いています。`
          : `${name}は別のボイスメッセージを録音しています。`;
      case "limit":
        return "今日の上限に達しました。あとでもう一度お試しください。";
      case "not-eligible":
        return photo ? "この写真は描き直せません。" : "このボイスメッセージは録り直せません。";
      default:
        return "リクエストを送れませんでした。もう一度お試しください。";
    }
  },
  selfSection: "あなたについて",
  selfRow: "写真の中のあなた",
  selfTitle: "写真の中のあなた",
  selfBody: "キャラクターが写真を送るとき、あなたが写ることがあります。顔は描きません。",
  selfAsk: "どのように写りますか？",
  selfAskNote: "いつも後ろ姿で、顔は描きません。あとで設定 › チャットで変えられます。",
  selfOptions: {
    female: { title: "女性", body: "後ろ姿" },
    male: { title: "男性", body: "後ろ姿" },
    hidden: { title: "手だけ", body: "手か肩だけ" },
  },
  save: "保存",
};
