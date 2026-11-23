// 메신저 서버 사진 · 음성 문구(ja, ADR-0146 「앱 연결」).

import type { ChatMediaCopy } from "../screens/messenger-chat/chat-media.contract";

export const messengerChatMediaJa: ChatMediaCopy = {
  notice: (notice, media, name, until) => {
    const photo = media === "photo";
    switch (notice) {
      case "blocked":
        return photo
          ? `${name}はその場面を送れませんでした。Yeopjeonはお返ししました。`
          : `${name}はそのメッセージを録音できませんでした。Yeopjeonはお返ししました。`;
      case "failed":
        return photo
          ? "写真が届きませんでした。Yeopjeonはお返ししました。"
          : "ボイスメッセージが届きませんでした。Yeopjeonはお返ししました。";
      case "limit":
        return until === null
          ? "今日の上限に達しました。しばらくしてからお試しください。"
          : `今日の上限に達しました。${until}以降にお試しください。`;
      case "busy":
        return photo
          ? `${name}は別の写真を準備中です。`
          : `${name}は別のボイスメッセージを録音中です。`;
      case "no-coins":
        return "Yeopjeonが足りません。追加してからもう一度お願いしてください。";
      case "not-eligible":
        return photo
          ? "このメッセージは写真にできません。"
          : "このメッセージはボイスメッセージにできません。";
      case "unavailable":
        return "写真とボイスメッセージは今は使えません。";
      case "sample-gift":
        return photo
          ? "今の1枚はサービスです！次のSnapshotからはYeopjeonを使います。"
          : "今の1回はサービスです！次のスナップボイスからはYeopjeonを使います。";
      default:
        return "リクエストを送れませんでした。接続を確認してもう一度お試しください。";
    }
  },
  hint: (availability, _media, name) => {
    switch (availability) {
      case "pending":
        return `${name}が準備中です`;
      case "done":
        return "このメッセージにはもう送られています";
      default:
        return `${name}の次のメッセージのあとに使えます`;
    }
  },
  aiLabel: "AI生成",
  voiceLabel: (name, ko, en) =>
    en === "" ? `${name}: ボイスメッセージ、${ko}` : `${name}: ボイスメッセージ、${ko}、${en}`,
  listVoice: "ボイスメッセージ",
};
