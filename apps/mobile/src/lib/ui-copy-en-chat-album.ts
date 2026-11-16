// 앨범 · 사진 속 내 모습 · 다시 만들기 문구(en, ADR-0150).

import type { ChatAlbumCopy } from "../screens/messenger-chat/chat-album.contract";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const messengerChatAlbumEn: ChatAlbumCopy = {
  sidebarRow: "Album",
  sidebarDescription: "Pictures and voice messages",
  title: (name) => `${name}'s album`,
  back: "Back",
  tabs: { all: "All", photos: "Photos", voice: "Voice" },
  day: (day) =>
    day.kind === "today"
      ? "Today"
      : day.kind === "yesterday"
        ? "Yesterday"
        : `${MONTHS[day.month - 1] ?? ""} ${day.day}`,
  drawing: "Drawing…",
  recording: "Recording…",
  versions: (count) => `${count} versions`,
  version: (index, count) => `Version ${index} of ${count}`,
  pastChat: "From a past chat",
  keepNote: "Pictures and voice messages stay here even if you delete the chat.",
  empty: (name) => `Pictures and voice messages from ${name} will appear here.`,
  loadFailed: "Couldn't load the album.",
  tryAgain: "Try again",
  more: "Show more",
  photoLabel: (name, line) =>
    line === "" ? `Picture from ${name}` : `Picture from ${name}, ${line}`,
  voiceLabel: (name, line) =>
    line === "" ? `Voice message from ${name}` : `Voice message from ${name}, ${line}`,
  viewerTitle: (name, day) => `${name} · ${day}`,
  fromChat: "From your chat",
  close: "Close",
  redraw: (price) => `Redraw · ${price}`,
  recordAgain: (price) => `Record again · ${price}`,
  play: "Play",
  pause: "Pause",
  redrawTitle: "Redraw this snapshot?",
  redrawBody: (name) =>
    `${name} will draw this moment again. You'll keep both pictures in your album.`,
  recordTitle: "Record again?",
  recordBody: (name) => `${name} will say this line again in a new take.`,
  confirmRedraw: (price) => `Redraw for ${price} Yeopjeon`,
  confirmRecord: (price) => `Record for ${price} Yeopjeon`,
  balance: (coins) => `You have ${coins} Yeopjeon`,
  getCoins: "Get Yeopjeon",
  cancel: "Cancel",
  refused: (notice, media, name) => {
    const photo = media === "photo";
    switch (notice) {
      case "no-coins":
        return "You don't have enough Yeopjeon.";
      case "busy":
        return photo
          ? `${name} is still working on another picture.`
          : `${name} is still recording another voice message.`;
      case "limit":
        return "You've reached today's limit. Try again later.";
      case "not-eligible":
        return photo
          ? "This picture can't be redrawn."
          : "This voice message can't be recorded again.";
      default:
        return "Couldn't send your request. Try again.";
    }
  },
  selfSection: "About you",
  selfRow: "You in snapshots",
  selfTitle: "You in snapshots",
  selfBody: "When a character sends a picture, you may appear in it. We never draw your face.",
  selfAsk: "How should you appear?",
  selfAskNote: "Always from behind, never your face. Change it later in Settings › Chats.",
  selfOptions: {
    female: { title: "Woman", body: "Seen from behind" },
    male: { title: "Man", body: "Seen from behind" },
    hidden: { title: "Just hands", body: "Only your hands or shoulder" },
  },
  save: "Save",
};
