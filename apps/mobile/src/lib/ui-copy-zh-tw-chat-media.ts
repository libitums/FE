// 메신저 서버 사진 · 음성 문구 대만 중국어(번체, zh-TW) 덩어리(ADR-0185).
// 번역 초안 — 원어민 검수 필요(ADR-0185).

import type { ChatMediaCopy } from "../screens/messenger-chat/chat-media.contract";

export const messengerChatMediaZhTw: ChatMediaCopy = {
  notice: (notice, media, name, until) => {
    const photo = media === "photo";
    switch (notice) {
      case "blocked":
        return photo
          ? `${name} 無法分享那個畫面。Yeopjeon 已退還給你。`
          : `${name} 無法錄下那則訊息。Yeopjeon 已退還給你。`;
      case "failed":
        return photo
          ? "照片沒有傳送成功。Yeopjeon 已退還給你。"
          : "語音訊息沒有傳送成功。Yeopjeon 已退還給你。";
      case "limit":
        return until === null
          ? "你已達到今天的上限，請稍後再試。"
          : `你已達到今天的上限，請在 ${until} 之後再試。`;
      case "busy":
        return photo ? `${name} 還在準備另一張照片。` : `${name} 還在錄另一則語音訊息。`;
      case "no-coins":
        return "你的 Yeopjeon 不夠。補充後再請求一次吧。";
      case "not-eligible":
        return photo ? "這則訊息無法變成照片。" : "這則訊息無法變成語音訊息。";
      case "unavailable":
        return "目前無法使用照片和語音訊息。";
      case "sample-gift":
        return photo
          ? "這張算我請客！下次 Snapshot 會使用你的 Yeopjeon。"
          : "這則算我請客！下次 Snap voice 會使用你的 Yeopjeon。";
      default:
        return "請求傳送失敗。請檢查網路連線後再試一次。";
    }
  },
  hint: (availability, _media, name) => {
    switch (availability) {
      case "pending":
        return `${name} 還在準備中`;
      case "done":
        return "這則訊息已經傳送過了";
      default:
        return `${name} 傳下一則訊息後即可使用`;
    }
  },
  aiLabel: "AI 生成",
  voiceLabel: (name, ko, en) =>
    en === "" ? `${name}：語音訊息，${ko}` : `${name}：語音訊息，${ko}，${en}`,
  listVoice: "語音訊息",
};
