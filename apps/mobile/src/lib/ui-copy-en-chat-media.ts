// 메신저 서버 사진 · 음성 문구(en, ADR-0146 「앱 연결」) — 회색 안내 줄 · 꺼진 알약 까닭 · AI 표시 · 길이 모르는 음성.

import type { ChatMediaCopy } from "../screens/messenger-chat/chat-media.contract";

export const messengerChatMediaEn: ChatMediaCopy = {
  notice: (notice, media, name, until) => {
    const photo = media === "photo";
    switch (notice) {
      case "blocked":
        return photo
          ? `${name} couldn't share that scene. Your Yeopjeon were returned.`
          : `${name} couldn't record that one. Your Yeopjeon were returned.`;
      case "failed":
        return photo
          ? "The picture didn't come through. Your Yeopjeon were returned."
          : "The voice message didn't come through. Your Yeopjeon were returned.";
      case "limit":
        return until === null
          ? "You've reached today's limit. Try again later."
          : `You've reached today's limit. Try again after ${until}.`;
      case "busy":
        return photo
          ? `${name} is still working on another picture.`
          : `${name} is still recording another voice message.`;
      case "no-coins":
        return "You don't have enough Yeopjeon. Get more to ask again.";
      case "not-eligible":
        return photo
          ? "This message can't become a picture."
          : "This message can't become a voice message.";
      case "unavailable":
        return "Pictures and voice messages aren't available right now.";
      case "sample-gift":
        return "That one was on me! Next time, a Snapshot uses your Yeopjeon.";
      default:
        return "Couldn't send your request. Check your connection and try again.";
    }
  },
  hint: (availability, _media, name) => {
    switch (availability) {
      case "pending":
        return `${name} is still working on it`;
      case "done":
        return "Already sent for this message";
      default:
        return `Available after ${name}'s next message`;
    }
  },
  aiLabel: "AI-generated",
  voiceLabel: (name, ko, en) =>
    en === "" ? `${name}: voice message, ${ko}` : `${name}: voice message, ${ko}, ${en}`,
  listVoice: "Voice message",
};
